import { execFile } from 'child_process';
import { promisify } from 'util';
import { ArchitecturePlan } from '@devclaw/contracts';

const execFileAsync = promisify(execFile);

export interface PlannerOutputPayload {
    summary: string;
    affectedFiles: string[];
    agentAssignments: Array<{
        domain: 'frontend' | 'backend';
        generator: string;
        reviewer: string;
    }>;
    riskFlags: string[];
}

export interface OpenClawCreatePromptInput {
    requestId: string;
    userId: string;
    repo: string;
    description: string;
    issueNumber?: number;
    repoFileTree?: string[];
}

export interface OpenClawRevisionPromptInput {
    existingPlan: ArchitecturePlan;
    repo: string;
    changeRequest: string;
    context?: string;
}

const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
};

const sanitizeAssignments = (
    value: unknown
): PlannerOutputPayload['agentAssignments'] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item: any) => {
            const domain: 'frontend' | 'backend' = item.domain === 'frontend' ? 'frontend' : 'backend';
            return {
                domain,
                generator: typeof item.generator === 'string' && item.generator.trim()
                    ? item.generator.trim()
                    : domain === 'frontend'
                        ? 'FrontendGenerator'
                        : 'BackendGenerator',
                reviewer: typeof item.reviewer === 'string' && item.reviewer.trim()
                    ? item.reviewer.trim()
                    : domain === 'frontend'
                        ? 'FrontendReviewer'
                        : 'BackendReviewer',
            };
        })
        .slice(0, 4);
};

const extractJsonObject = (text: string): string | null => {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
        return fenceMatch[1].trim();
    }

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
        return text.slice(start, end + 1).trim();
    }

    return null;
};

const parsePlannerPayload = (text: string): PlannerOutputPayload => {
    const jsonText = extractJsonObject(text);
    if (!jsonText) {
        throw new Error('Planner response did not contain a JSON object');
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw new Error('Planner response JSON could not be parsed');
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const affectedFiles = normalizeStringArray(parsed.affectedFiles);
    const riskFlags = normalizeStringArray(parsed.riskFlags);
    const agentAssignments = sanitizeAssignments(parsed.agentAssignments);

    if (!summary) {
        throw new Error('Planner response is missing summary');
    }
    if (affectedFiles.length === 0) {
        throw new Error('Planner response is missing affectedFiles');
    }
    if (agentAssignments.length === 0) {
        throw new Error('Planner response is missing agentAssignments');
    }

    return {
        summary,
        affectedFiles,
        agentAssignments,
        riskFlags,
    };
};

const collectTextFields = (value: unknown, output: string[]): void => {
    if (typeof value === 'string') {
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectTextFields(item, output));
        return;
    }
    if (!value || typeof value !== 'object') {
        return;
    }

    const record = value as Record<string, unknown>;
    const text = record.text;
    if (typeof text === 'string' && text.trim()) {
        output.push(text.trim());
    }

    for (const entry of Object.values(record)) {
        collectTextFields(entry, output);
    }
};

const extractPlannerTextFromCliOutput = (stdout: string): string => {
    const raw = stdout.trim();
    if (!raw) {
        throw new Error('OpenClaw CLI returned empty stdout');
    }

    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        const embeddedJson = extractJsonObject(raw);
        if (!embeddedJson) {
            throw new Error('OpenClaw CLI stdout is not JSON');
        }
        parsed = JSON.parse(embeddedJson);
    }

    const textFields: string[] = [];
    collectTextFields(parsed, textFields);
    if (textFields.length === 0) {
        throw new Error('OpenClaw CLI JSON did not contain any text payload');
    }

    return textFields.join('\n');
};

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolvePlannerRecipient = (): string => {
    const gatewayTo = process.env.OPENCLAW_GATEWAY_TO;
    if (typeof gatewayTo === 'string' && gatewayTo.trim()) {
        return gatewayTo.trim();
    }

    const localTo = process.env.OPENCLAW_LOCAL_TO;
    if (typeof localTo === 'string' && localTo.trim()) {
        return localTo.trim();
    }

    return '+15555550123';
};

const buildCreatePrompt = (input: OpenClawCreatePromptInput): string => {
    return [
        'You are OpenClaw acting as an architecture planner for a coding task.',
        'Return ONLY JSON (no markdown).',
        'Required shape:',
        '{"summary":"string","affectedFiles":["string"],"agentAssignments":[{"domain":"frontend|backend","generator":"string","reviewer":"string"}],"riskFlags":["string"]}',
        'Rules:',
        '- Keep summary concise and implementation-focused.',
        '- Include 1-12 affectedFiles entries.',
        '- Include at least one agentAssignment.',
        '- riskFlags can be empty when no risks are detected.',
        '',
        `requestId: ${input.requestId}`,
        `userId: ${input.userId}`,
        `repo: ${input.repo}`,
        `issueNumber: ${input.issueNumber ?? 'n/a'}`,
        `task: ${input.description}`,
        ...(input.repoFileTree && input.repoFileTree.length > 0
            ? ['repository file tree:', ...input.repoFileTree.slice(0, 500).map(f => `- ${f}`)]
            : [])
    ].join('\n');
};

const buildRevisionPrompt = (input: OpenClawRevisionPromptInput): string => {
    return [
        'You are OpenClaw revising an existing architecture plan.',
        'Return ONLY JSON (no markdown).',
        'Required shape:',
        '{"summary":"string","affectedFiles":["string"],"agentAssignments":[{"domain":"frontend|backend","generator":"string","reviewer":"string"}],"riskFlags":["string"]}',
        'Apply the change request while preserving still-valid existing plan details.',
        '',
        `repo: ${input.repo}`,
        `planId: ${input.existingPlan.planId}`,
        `requestId: ${input.existingPlan.requestId}`,
        `existingSummary: ${input.existingPlan.summary}`,
        `existingAffectedFiles: ${JSON.stringify(input.existingPlan.affectedFiles)}`,
        `existingAssignments: ${JSON.stringify(input.existingPlan.agentAssignments)}`,
        `existingRiskFlags: ${JSON.stringify(input.existingPlan.riskFlags)}`,
        `changeRequest: ${input.changeRequest}`,
        `context: ${input.context || 'n/a'}`,
    ].join('\n');
};

const runGatewayAgentPrompt = async (prompt: string): Promise<string> => {
    const cliBin = process.env.OPENCLAW_CLI_BIN || 'openclaw';
    const timeoutMs = parseNumberEnv(process.env.OPENCLAW_CLI_TIMEOUT_MS, 20 * 60 * 1000);
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const params = {
        message: prompt,
        to: resolvePlannerRecipient(),
        timeout: timeoutSeconds,
        idempotencyKey: `planner-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    };
    const args = [
        'gateway',
        'call',
        'agent',
        '--json',
        '--expect-final',
        '--timeout',
        String(timeoutMs),
        '--params',
        JSON.stringify(params),
    ];

    if (process.env.OPENCLAW_GATEWAY_URL) {
        args.push('--url', process.env.OPENCLAW_GATEWAY_URL);
    }
    if (process.env.OPENCLAW_GATEWAY_TOKEN) {
        args.push('--token', process.env.OPENCLAW_GATEWAY_TOKEN);
    }

    try {
        const { stdout, stderr } = await execFileAsync(cliBin, args, {
            timeout: timeoutMs + 5000,
            maxBuffer: 8 * 1024 * 1024,
        });

        if (typeof stderr === 'string' && stderr.trim()) {
            console.warn('[OpenClawEngine] OpenClaw stderr:', stderr.trim());
        }

        return extractPlannerTextFromCliOutput(stdout);
    } catch (err: any) {
        const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
        const stdout = typeof err?.stdout === 'string' ? err.stdout.trim() : '';
        const detail = stderr || stdout || err?.message || 'unknown OpenClaw gateway error';
        throw new Error(`OpenClaw gateway invocation failed: ${detail}`);
    }
};

const runAgentLocalPrompt = async (prompt: string): Promise<string> => {
    const cliBin = process.env.OPENCLAW_CLI_BIN || 'openclaw';
    const timeoutMs = parseNumberEnv(process.env.OPENCLAW_CLI_TIMEOUT_MS, 20 * 60 * 1000);
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const to = process.env.OPENCLAW_LOCAL_TO || '+15555550123';
    const args = [
        'agent',
        '--local',
        '--json',
        '--to',
        to,
        '--timeout',
        String(timeoutSeconds),
        '--message',
        prompt,
    ];

    try {
        const { stdout, stderr } = await execFileAsync(cliBin, args, {
            timeout: timeoutMs + 10000,
            maxBuffer: 8 * 1024 * 1024,
        });

        if (typeof stderr === 'string' && stderr.trim()) {
            console.warn('[OpenClawEngine] OpenClaw stderr:', stderr.trim());
        }

        return extractPlannerTextFromCliOutput(stdout);
    } catch (err: any) {
        const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
        const stdout = typeof err?.stdout === 'string' ? err.stdout.trim() : '';
        const detail = stderr || stdout || err?.message || 'unknown OpenClaw local error';
        throw new Error(`OpenClaw local invocation failed: ${detail}`);
    }
};

const runOpenClawPlannerPrompt = async (prompt: string): Promise<PlannerOutputPayload> => {
    const mode = (process.env.OPENCLAW_CLI_MODE || 'gateway').toLowerCase();
    const raw = mode === 'agent-local'
        ? await runAgentLocalPrompt(prompt)
        : await runGatewayAgentPrompt(prompt);

    return parsePlannerPayload(raw);
};

export const createPlanWithOpenClawCli = async (
    input: OpenClawCreatePromptInput
): Promise<PlannerOutputPayload> => {
    const prompt = buildCreatePrompt(input);
    return runOpenClawPlannerPrompt(prompt);
};

export const revisePlanWithOpenClawCli = async (
    input: OpenClawRevisionPromptInput
): Promise<PlannerOutputPayload> => {
    const prompt = buildRevisionPrompt(input);
    return runOpenClawPlannerPrompt(prompt);
};
