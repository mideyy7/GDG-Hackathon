import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { ArchitecturePlan } from '@devclaw/contracts';

const execFileAsync = promisify(execFile);

type AgentDomain = 'frontend' | 'backend';

interface PlanDetailsRecord {
    plan?: ArchitecturePlan;
    blueprint?: {
        branch?: {
            name?: string;
            baseBranch?: string;
        };
    };
}

export interface ExecutionSubTask {
    id: string;
    domain: AgentDomain;
    agent: 'Frontend' | 'Backend';
    objective: string;
    files: string[];
    generator: string;
    reviewer: string;
}

export interface IsolatedEnvironmentInput {
    runId: string;
    repoFullName: string;
    planId?: string;
    description?: string;
    planDetails?: unknown;
    preferredBranchName?: string;
    githubToken?: string;
}

export interface IsolatedEnvironment {
    workspacePath: string;
    branchName: string;
    baseBranch: string;
}

const FRONTEND_FILE_HINTS = [
    /^apps\//i,
    /^frontend\//i,
    /\/frontend\//i,
    /\/ui\//i,
    /\/web\//i,
    /\.(tsx|jsx|css|scss|less|html)$/i,
];

const BACKEND_FILE_HINTS = [
    /^services\//i,
    /^backend\//i,
    /\/backend\//i,
    /\/api\//i,
    /\/server\//i,
    /\.(ts|js|json|sql|prisma|yaml|yml)$/i,
];

const isArchitecturePlan = (value: unknown): value is ArchitecturePlan => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.planId === 'string' &&
        typeof candidate.requestId === 'string' &&
        typeof candidate.summary === 'string' &&
        Array.isArray(candidate.affectedFiles) &&
        Array.isArray(candidate.agentAssignments) &&
        Array.isArray(candidate.riskFlags)
    );
};

const parsePlanDetails = (planDetails: unknown): PlanDetailsRecord | ArchitecturePlan | null => {
    if (!planDetails) {
        return null;
    }

    if (typeof planDetails === 'string') {
        try {
            const parsed = JSON.parse(planDetails) as unknown;
            if (parsed && typeof parsed === 'object') {
                return parsed as PlanDetailsRecord | ArchitecturePlan;
            }
        } catch {
            return null;
        }
        return null;
    }

    if (typeof planDetails === 'object') {
        return planDetails as PlanDetailsRecord | ArchitecturePlan;
    }

    return null;
};

const sanitizeBranchToken = (value: string): string => {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return normalized || 'task';
};

const detectFileDomain = (filePath: string): AgentDomain | 'unknown' => {
    if (FRONTEND_FILE_HINTS.some((pattern) => pattern.test(filePath))) {
        return 'frontend';
    }
    if (BACKEND_FILE_HINTS.some((pattern) => pattern.test(filePath))) {
        return 'backend';
    }
    return 'unknown';
};

const asUnique = (values: string[]): string[] => [...new Set(values)];

const normalizeRepoCloneUrl = (repoFullName: string): string => {
    const trimmed = (repoFullName || '').trim();
    if (!trimmed) {
        throw new Error('Cannot provision isolated environment: missing repo name.');
    }

    if (/^[a-zA-Z]+:\/\//.test(trimmed) || trimmed.startsWith('git@')) {
        if (trimmed.startsWith('git@') || trimmed.endsWith('.git')) {
            return trimmed;
        }
        return `${trimmed}.git`;
    }

    return `https://github.com/${trimmed.replace(/\.git$/, '')}.git`;
};

const withGithubToken = (cloneUrl: string, githubToken?: string): string => {
    if (!githubToken) {
        return cloneUrl;
    }

    try {
        const parsed = new URL(cloneUrl);
        if (parsed.hostname.toLowerCase() === 'github.com') {
            parsed.username = 'x-access-token';
            parsed.password = githubToken;
            return parsed.toString();
        }
    } catch {
        return cloneUrl;
    }

    return cloneUrl;
};

const redactSecrets = (value: string): string => value.replace(/(x-access-token:)[^@]+@/gi, '$1***@');

const resolveGitTimeoutMs = (): number => {
    const parsed = Number.parseInt(process.env.ORCHESTRATOR_GIT_TIMEOUT_MS || '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }
    return 15 * 60 * 1000;
};

const runGit = async (args: string[], cwd?: string): Promise<void> => {
    try {
        await execFileAsync('git', args, {
            cwd,
            timeout: resolveGitTimeoutMs(),
        });
    } catch (err: any) {
        const stderr = typeof err?.stderr === 'string' ? err.stderr.trim() : '';
        const safeArgs = args.map(redactSecrets).join(' ');
        const reason = stderr || err?.message || 'unknown git failure';
        throw new Error(`Git command failed (git ${safeArgs}): ${reason}`);
    }
};

const buildFallbackBranchName = (planId?: string, description?: string): string => {
    const planToken = sanitizeBranchToken((planId || 'run').replace(/^plan-/, ''));
    const descriptionToken = sanitizeBranchToken(description || 'task');
    return `devclaw/fix-${planToken}-${descriptionToken}`;
};

export const resolveApprovedPlan = (planDetails: unknown): ArchitecturePlan | undefined => {
    const parsed = parsePlanDetails(planDetails);
    if (!parsed) {
        return undefined;
    }
    if (isArchitecturePlan(parsed)) {
        return parsed;
    }
    if (isArchitecturePlan((parsed as PlanDetailsRecord).plan)) {
        return (parsed as PlanDetailsRecord).plan;
    }
    return undefined;
};

export const resolvePreferredExecutionBranch = (
    planDetails: unknown,
    fallbackPlanId?: string,
    fallbackDescription?: string
): { branchName: string; baseBranch: string } => {
    const parsed = parsePlanDetails(planDetails);
    const branchName = typeof (parsed as PlanDetailsRecord | null)?.blueprint?.branch?.name === 'string'
        ? (parsed as PlanDetailsRecord).blueprint?.branch?.name?.trim()
        : undefined;
    const baseBranch = typeof (parsed as PlanDetailsRecord | null)?.blueprint?.branch?.baseBranch === 'string'
        ? (parsed as PlanDetailsRecord).blueprint?.branch?.baseBranch?.trim()
        : undefined;

    return {
        branchName: branchName || buildFallbackBranchName(fallbackPlanId, fallbackDescription),
        baseBranch: baseBranch || process.env.ORCHESTRATOR_BASE_BRANCH || 'main',
    };
};

export const buildExecutionSubTasks = (plan?: ArchitecturePlan): ExecutionSubTask[] => {
    if (!plan) {
        return [];
    }

    const filesByDomain: Record<AgentDomain, string[]> = {
        frontend: [],
        backend: [],
    };
    const unknownFiles: string[] = [];

    for (const file of plan.affectedFiles || []) {
        const domain = detectFileDomain(file);
        if (domain === 'unknown') {
            unknownFiles.push(file);
        } else {
            filesByDomain[domain].push(file);
        }
    }

    const assignments = plan.agentAssignments || [];
    const domainOrder: AgentDomain[] = ['frontend', 'backend'];
    const subtasks: ExecutionSubTask[] = [];

    for (const domain of domainOrder) {
        const domainAssignment = assignments.find((assignment) => assignment.domain === domain);
        const hasDomainFiles = filesByDomain[domain].length > 0;
        if (!domainAssignment && !hasDomainFiles) {
            continue;
        }

        subtasks.push({
            id: `${plan.planId}-${domain}`,
            domain,
            agent: domain === 'frontend' ? 'Frontend' : 'Backend',
            objective: plan.summary,
            files: asUnique(
                hasDomainFiles
                    ? [...filesByDomain[domain], ...unknownFiles]
                    : [...plan.affectedFiles]
            ),
            generator: domainAssignment?.generator || `${domain}-generator`,
            reviewer: domainAssignment?.reviewer || `${domain}-reviewer`,
        });
    }

    if (subtasks.length === 0) {
        subtasks.push({
            id: `${plan.planId}-backend`,
            domain: 'backend',
            agent: 'Backend',
            objective: plan.summary,
            files: asUnique(plan.affectedFiles || []),
            generator: 'backend-generator',
            reviewer: 'backend-reviewer',
        });
    }

    return subtasks;
};

export const provisionIsolatedExecutionEnvironment = async (
    input: IsolatedEnvironmentInput
): Promise<IsolatedEnvironment> => {
    const isolationRoot =
        process.env.ORCHESTRATOR_ISOLATION_ROOT ||
        path.join(os.tmpdir(), 'devclaw-isolated-workspaces');

    await mkdir(isolationRoot, { recursive: true });

    // Include milliseconds so simultaneous runs for the same runId don't collide.
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
    const workspacePath = path.join(isolationRoot, `${input.runId}-${stamp}`);
    const cloneUrl = withGithubToken(normalizeRepoCloneUrl(input.repoFullName), input.githubToken);
    const { branchName, baseBranch } = resolvePreferredExecutionBranch(
        input.planDetails,
        input.planId,
        input.description
    );
    const preferredBranchName = input.preferredBranchName?.trim() || branchName;

    try {
        try {
            await runGit(['clone', '--depth', '1', '--branch', baseBranch, cloneUrl, workspacePath]);
        } catch {
            await rm(workspacePath, { recursive: true, force: true });
            await runGit(['clone', '--depth', '1', cloneUrl, workspacePath]);
        }

        await runGit(['checkout', '-b', preferredBranchName], workspacePath);
    } catch (err) {
        await rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
        throw err;
    }

    return {
        workspacePath,
        branchName: preferredBranchName,
        baseBranch,
    };
};
