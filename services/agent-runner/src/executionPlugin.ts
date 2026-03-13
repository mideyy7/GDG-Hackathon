import axios from 'axios';
import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { ArchitecturePlan } from '@devcore/contracts';

const execFileAsync = promisify(execFile);

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
    engine: 'stub' | 'openclaw' | 'docker' | 'agent-runner';
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

interface DockerConfig {
    image: string;
    command: string;
    timeoutMs: number;
    network: string;
    cpus?: string;
    memory?: string;
    pidsLimit?: string;
}

interface CommandOptions {
    timeoutMs?: number;
}

interface CommandResult {
    stdout: string;
    stderr: string;
}

type DockerCommandExecutor = (
    args: string[],
    options?: CommandOptions
) => Promise<CommandResult>;

const normalizeInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveDockerConfig = (): DockerConfig => ({
    image: process.env.RUNNER_DOCKER_IMAGE || 'node:22-bookworm-slim',
    command: process.env.RUNNER_DOCKER_COMMAND || 'echo "DevCore sandbox execution completed."',
    timeoutMs: normalizeInteger(process.env.RUNNER_DOCKER_TIMEOUT_MS, 20 * 60 * 1000),
    network: process.env.RUNNER_DOCKER_NETWORK || 'none',
    cpus: process.env.RUNNER_DOCKER_CPUS || '2',
    memory: process.env.RUNNER_DOCKER_MEMORY || '4g',
    pidsLimit: process.env.RUNNER_DOCKER_PIDS_LIMIT || '512',
});

const sanitizeContainerToken = (value: string): string => {
    const token = value
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 42);
    return token || 'run';
};

const isTimeoutError = (err: any): boolean => {
    const code = err?.code;
    const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
    return code === 'ETIMEDOUT' || message.includes('timed out');
};

const runDockerCli: DockerCommandExecutor = async (
    args: string[],
    options?: CommandOptions
): Promise<CommandResult> => {
    try {
        const result = await execFileAsync('docker', args, {
            timeout: options?.timeoutMs,
            maxBuffer: 10 * 1024 * 1024,
        });
        return {
            stdout: (result.stdout || '').toString(),
            stderr: (result.stderr || '').toString(),
        };
    } catch (err: any) {
        const stderr = (err?.stderr || '').toString().trim();
        const stdout = (err?.stdout || '').toString().trim();
        const detail = stderr || stdout || err?.message || 'unknown docker error';
        const wrapped: any = new Error(`Docker command failed (docker ${args.join(' ')}): ${detail}`);
        wrapped.code = err?.code;
        throw wrapped;
    }
};

export class DockerExecutionPlugin implements ExecutionPlugin {
    constructor(private readonly runDocker: DockerCommandExecutor = runDockerCli) { }

    private async forceRemoveContainer(containerRef: string): Promise<void> {
        if (!containerRef) {
            return;
        }
        try {
            await this.runDocker(['rm', '-f', containerRef]);
        } catch {
            // Best-effort cleanup; container may have already been removed.
        }
    }

    async execute(payload: ExecutePayload): Promise<ExecuteDispatch> {
        if (!payload.isolatedEnvironmentPath) {
            throw new Error('Docker execution requires isolatedEnvironmentPath from orchestrator.');
        }

        const workspacePath = path.resolve(payload.isolatedEnvironmentPath);
        await access(workspacePath, fsConstants.F_OK | fsConstants.R_OK | fsConstants.W_OK);

        const config = resolveDockerConfig();
        const runToken = sanitizeContainerToken(payload.runId);
        const containerName = `devcore-${runToken}-${Date.now()}`;
        let containerRef = containerName;

        try {
            const runArgs = [
                'run',
                '-d',
                '--name',
                containerName,
                '--label',
                'devcore.managed=true',
                '--label',
                `devcore.run_id=${payload.runId}`,
                '--workdir',
                '/workspace',
                '-v',
                `${workspacePath}:/workspace`,
                '--network',
                config.network,
                '--cpus',
                config.cpus || '2',
                '--memory',
                config.memory || '4g',
                '--pids-limit',
                config.pidsLimit || '512',
                '-e',
                `DEVCORE_RUN_ID=${payload.runId}`,
                '-e',
                `DEVCORE_PLAN_ID=${payload.planId || ''}`,
                '-e',
                `DEVCORE_REPO=${payload.repo || ''}`,
                '-e',
                `DEVCORE_BRANCH=${payload.executionBranchName || ''}`,
                config.image,
                'sh',
                '-lc',
                config.command,
            ];

            const started = await this.runDocker(runArgs);
            const startedRef = started.stdout.trim().split('\n').pop()?.trim();
            if (startedRef) {
                containerRef = startedRef;
            }

            const waitResult = await this.runDocker(['wait', containerRef], {
                timeoutMs: config.timeoutMs,
            });
            const rawExitCode = waitResult.stdout.trim().split(/\s+/).pop() || '';
            const exitCode = Number.parseInt(rawExitCode, 10);

            let logs = '';
            try {
                const logsResult = await this.runDocker(['logs', '--tail', '200', containerRef]);
                logs = [logsResult.stdout, logsResult.stderr]
                    .filter((value) => value && value.trim())
                    .join('\n')
                    .trim();
            } catch {
                // Ignore log retrieval failures.
            }

            if (!Number.isFinite(exitCode)) {
                throw new Error(`Sandbox container ${containerRef} did not return a valid exit code.`);
            }

            if (exitCode !== 0) {
                throw new Error(
                    `Sandbox container exited with status ${exitCode}.${logs ? ` Logs:\n${logs}` : ''}`
                );
            }

            return {
                runRef: `docker-${payload.runId}`,
                engine: 'docker',
                accepted: true,
            };
        } catch (err: any) {
            if (isTimeoutError(err)) {
                throw new Error(
                    `Sandbox container timed out after ${Math.floor(config.timeoutMs / 1000)}s for run ${payload.runId}.`
                );
            }
            throw err;
        } finally {
            await this.forceRemoveContainer(containerRef);
        }
    }
}

export const getExecutionPlugin = (): ExecutionPlugin => {
    const engine = (process.env.RUNNER_ENGINE || 'stub').toLowerCase();
    if (engine === 'docker') {
        return new DockerExecutionPlugin();
    }
    if (engine === 'openclaw') {
        return new OpenClawExecutionPlugin();
    }
    return new StubExecutionPlugin();
};
