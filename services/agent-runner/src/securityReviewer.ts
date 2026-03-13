import { chat } from '@devclaw/llm-router';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecurityScanInput {
  runId: string;
  requestId?: string;
  diff: string;               // full unified diff of the approved patch set
  affectedFiles?: string[];   // file paths changed (for context)
  description?: string;       // original task description
}

export interface Vulnerability {
  category: string;   // e.g. "A03:2021 – Injection"
  severity: 'critical' | 'high' | 'medium' | 'low';
  file?: string;
  line?: string;
  detail: string;     // specific description of the issue
  recommendation: string;
}

export interface SecurityScanResult {
  passed: boolean;
  vulnerabilities: Vulnerability[];
  summary: string;
  model: string;
  provider: string;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class SecurityVulnerabilityError extends Error {
  constructor(
    public readonly result: SecurityScanResult,
    public readonly runId: string,
  ) {
    const count = result.vulnerabilities.length;
    const topSev = result.vulnerabilities[0]?.severity ?? 'unknown';
    super(
      `[SecurityReviewer] PR blocked: ${count} vulnerability${count !== 1 ? 'ies' : 'y'} found ` +
      `(highest severity: ${topSev}) for runId=${runId}`
    );
    this.name = 'SecurityVulnerabilityError';
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const OWASP_SYSTEM_PROMPT = `You are a world-class application security engineer performing an automated security gate review.
Your task is to analyse a unified git diff and determine whether it introduces any of the OWASP Top 10 security vulnerabilities.

OWASP Top 10 (2021) you must check for:
- A01: Broken Access Control (missing auth checks, privilege escalation, path traversal)
- A02: Cryptographic Failures (hardcoded secrets, weak algorithms, unencrypted sensitive data)
- A03: Injection (SQL injection, command injection, XSS, SSTI, LDAP injection)
- A04: Insecure Design (missing rate limiting on sensitive operations, lack of input validation)
- A05: Security Misconfiguration (debug mode enabled, permissive CORS, exposed stack traces)
- A06: Vulnerable Components (importing known-vulnerable package versions)
- A07: Authentication Failures (broken session management, insecure credential storage)
- A08: Software Integrity Failures (unsigned updates, deserialization of untrusted data)
- A09: Logging Failures (logging passwords/tokens, missing audit trails for sensitive ops)
- A10: SSRF (user-controlled URLs passed to internal fetch/request calls)

HARDCODED SECRETS rule: Any literal that looks like an API key, password, private key, or token (e.g. patterns like sk-..., ghp_..., -----BEGIN PRIVATE KEY-----, password = "...") must be flagged as CRITICAL A02.

APPROVAL BIAS: Only flag concrete, demonstrable issues in the diff. Do NOT flag theoretical issues or speculative risks.

Return ONLY a valid JSON object with this exact shape:
{
  "passed": true | false,
  "summary": "One sentence summary",
  "vulnerabilities": [
    {
      "category": "A03:2021 – Injection",
      "severity": "critical" | "high" | "medium" | "low",
      "file": "relative/path/to/file.ts",
      "line": "approximate line reference",
      "detail": "Specific description of the issue in the diff",
      "recommendation": "Concrete fix recommendation"
    }
  ]
}

"passed" must be false if ANY critical or high severity vulnerability is found.
"passed" must be true if only medium/low issues exist (include them as informational).
"vulnerabilities" must be an empty array if no issues are found.`;

const buildScanMessages = (input: SecurityScanInput) => {
  const diffPreview = input.diff.length > 40_000
    ? `${input.diff.slice(0, 40_000)}\n...(diff truncated at 40k chars)`
    : input.diff;

  const userContent = [
    `runId: ${input.runId}`,
    ...(input.requestId ? [`requestId: ${input.requestId}`] : []),
    ...(input.description ? [`taskDescription: ${input.description}`] : []),
    ...(input.affectedFiles?.length ? [`affectedFiles: ${input.affectedFiles.join(', ')}`] : []),
    '',
    '=== DIFF TO REVIEW ===',
    diffPreview,
  ].join('\n');

  return [
    { role: 'system' as const, content: OWASP_SYSTEM_PROMPT },
    { role: 'user' as const, content: userContent },
  ];
};

// ─── Parser ───────────────────────────────────────────────────────────────────

const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

const parseVulnerabilities = (raw: unknown): Vulnerability[] => {
  if (!Array.isArray(raw)) return [];
  const results: Vulnerability[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const v = item as Record<string, unknown>;
    const severity = typeof v.severity === 'string' && VALID_SEVERITIES.has(v.severity.toLowerCase())
      ? (v.severity.toLowerCase() as Vulnerability['severity'])
      : 'medium';
    results.push({
      category: typeof v.category === 'string' ? v.category.trim() : 'Unknown',
      severity,
      file: typeof v.file === 'string' ? v.file.trim() : undefined,
      line: typeof v.line === 'string' ? v.line.trim() : undefined,
      detail: typeof v.detail === 'string' ? v.detail.trim() : 'No detail provided',
      recommendation: typeof v.recommendation === 'string' ? v.recommendation.trim() : '',
    });
  }
  return results;
};

const extractJsonObject = (text: string): string | null => {
  let clean = text.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7).trim();
  else if (clean.startsWith('```')) clean = clean.slice(3).trim();
  if (clean.endsWith('```')) clean = clean.slice(0, -3).trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) return clean.slice(start, end + 1);
  return null;
};

const parseScanResponse = (content: string): { passed: boolean; vulnerabilities: Vulnerability[]; summary: string } => {
  const candidate = extractJsonObject(content);
  if (candidate) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const vulnerabilities = parseVulnerabilities(parsed.vulnerabilities);
      const hasCriticalOrHigh = vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high');
      // Trust the model's passed field, but override if it says passed=true with critical/high vulns
      const passed = !hasCriticalOrHigh && (parsed.passed === true || vulnerabilities.length === 0);
      return {
        passed,
        vulnerabilities,
        summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : 'Security scan completed.',
      };
    } catch {
      // fall through to heuristic
    }
  }
  // Heuristic: if response mentions no vulnerabilities, consider passed
  const lower = content.toLowerCase();
  const passed = !lower.includes('critical') && !lower.includes('injection') && !lower.includes('hardcoded');
  return {
    passed,
    vulnerabilities: [],
    summary: content.trim().slice(0, 200),
  };
};

// ─── Agent ────────────────────────────────────────────────────────────────────

export class SecurityReviewAgent {
  async scan(input: SecurityScanInput): Promise<SecurityScanResult> {
    if (!input.diff || input.diff.trim().length === 0) {
      return {
        passed: true,
        vulnerabilities: [],
        summary: 'No diff to review — security scan skipped.',
        model: 'n/a',
        provider: 'n/a',
      };
    }

    const response = await chat({
      role: 'security_reviewer',
      requestId: input.requestId,
      messages: buildScanMessages(input),
      temperature: 0,
    });

    const parsed = parseScanResponse(response.content);

    return {
      passed: parsed.passed,
      vulnerabilities: parsed.vulnerabilities,
      summary: parsed.summary,
      model: response.model,
      provider: response.provider,
    };
  }
}
