import axios from 'axios';
import { ArchitecturePlan } from '@coredev/contracts';

export interface ExecutionSubTask {
    id: string;
    domain: 'frontend' | 'backend';
    agent: 'Frontend' | 'Backend';
    objective: string;
    files: string[];
    generator: string;
    reviewer: string;
}

export interface ExecutePayload {
    runId: string;
    planId?: string;
    requestId?: string;
    userId?: string;
    repo?: string;
    issueNumber?: number;
    issueUrl?: string;
    description?: string;
    plan?: ArchitecturePlan;
    executionSubTasks?: ExecutionSubTask[];
    isolatedEnvironmentPath?: string;
    executionBranchName?: string;
    agentLoopReport?: unknown;
    approvedPatchSet?: unknown;
    branchPush?: unknown;
    /** Chat ID to send real-time progress notifications to during execution */
    progressChatId?: string;
    /** Bot URL (e.g. WhatsApp bot) to POST progress messages to */
    progressBotUrl?: string;
    /** Orchestrator callback URL to POST structured progress events (for web dashboard SSE) */
    progressCallbackUrl?: string;
}

export interface ApprovedPatchSubTask {
    subTaskId: string;
    domain: ExecutionSubTask['domain'];
    agent: ExecutionSubTask['agent'];
    generator: string;
    reviewer: string;
    iterations: number;
    reviewerNotes: string[];
    filesChanged: string[];
    commitSha: string;
    patch: string;
}

export interface ApprovedPatchSet {
    patchSetRef: string;
    runId: string;
    planId?: string;
    branchName: string;
    baseCommit: string;
    headCommit: string;
    createdAt: string;
    subTasks: ApprovedPatchSubTask[];
    patch: string;
}

export interface BranchPushResult {
    remote: string;
    branchName: string;
    headCommit: string;
    pushed: boolean;
}

export interface ExecuteDispatch {
    runRef: string;
    engine: 'stub' | 'openclaw' | 'agent-runner';
    accepted: boolean;
}

export interface ExecutionPlugin {
    execute(payload: ExecutePayload): Promise<ExecuteDispatch>;
}

class StubExecutionPlugin implements ExecutionPlugin {
    async execute(payload: ExecutePayload): Promise<ExecuteDispatch> {
        return {
            runRef: `stub-${payload.runId}`,
            engine: 'stub',
            accepted: true,
        };
    }
}

const normalizeInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class OpenClawExecutionPlugin implements ExecutionPlugin {
    private readonly baseUrl = process.env.OPENCLAW_RUNNER_URL || 'http://localhost:3040';
    private readonly executePath = process.env.OPENCLAW_RUNNER_EXECUTE_PATH || '/api/execute';
    private readonly timeoutMs = normalizeInteger(
        process.env.RUNNER_OPENCLAW_EXECUTE_TIMEOUT_MS,
        4 * 60 * 60 * 1000
    );

    async execute(payload: ExecutePayload): Promise<ExecuteDispatch> {
        const res = await axios.post(`${this.baseUrl}${this.executePath}`, {
            ...payload,
            source: 'agent-runner',
            callbackUrl: process.env.ORCHESTRATOR_CALLBACK_URL,
        }, {
            timeout: this.timeoutMs,
        });

        return {
            runRef: res.data?.runRef || payload.runId,
            engine: 'openclaw',
            accepted: true,
        };
    }
}

export const getExecutionPlugin = (): ExecutionPlugin => {
    const engine = (process.env.RUNNER_ENGINE || 'stub').toLowerCase();
    if (engine === 'openclaw') {
        return new OpenClawExecutionPlugin();
    }
    return new StubExecutionPlugin();
};
