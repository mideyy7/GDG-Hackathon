import { AgentLoopManager, AgentLoopReport } from '../src/agentLoopManager';
import { ExecutionCoordinator } from '../src/executionCoordinator';
import { ExecutionStageManager } from '../src/executionStageManager';
import {
    ApprovedPatchSet,
    BranchPushResult,
    ExecutePayload,
    ExecutionPlugin,
} from '../src/executionPlugin';

const createPayload = (overrides?: Partial<ExecutePayload>): ExecutePayload => ({
    runId: 'run-123',
    planId: 'plan-123',
    executionSubTasks: [
        {
            id: 'plan-123-frontend',
            domain: 'frontend',
            agent: 'Frontend',
            objective: 'Fix frontend behavior',
            files: ['apps/web/src/App.tsx'],
            generator: 'FrontendGenerator',
            reviewer: 'FrontendReviewer',
        },
    ],
    ...overrides,
});

const createAgentLoopReport = (): AgentLoopReport => ({
    maxIterations: 3,
    totalSubTasks: 1,
    approvedSubTasks: 1,
    rewriteRequiredSubTasks: 0,
    subTasks: [
        {
            subTaskId: 'plan-123-frontend',
            domain: 'frontend',
            agent: 'Frontend',
            iterations: 1,
            finalDecision: 'APPROVED',
            reviewerNotes: ['Looks good'],
            trace: [],
        },
    ],
});

const createPatchSet = (): ApprovedPatchSet => ({
    patchSetRef: 'run-123:abc123',
    runId: 'run-123',
    planId: 'plan-123',
    branchName: 'devclaw/fix-plan-123',
    baseCommit: 'abc',
    headCommit: 'def',
    createdAt: new Date().toISOString(),
    subTasks: [],
    patch: 'diff --git a/file b/file',
});

const createBranchPush = (): BranchPushResult => ({
    remote: 'origin',
    branchName: 'devclaw/fix-plan-123',
    headCommit: 'def',
    pushed: true,
});

describe('ExecutionCoordinator', () => {
    afterEach(() => {
        delete process.env.RUNNER_AGENT_LOOP_ENABLED;
    });

    it('uses execution stage flow when isolated environment and subTasks are provided', async () => {
        const plugin: ExecutionPlugin = {
            execute: jest.fn(async () => ({
                runRef: 'stub-run',
                engine: 'stub' as const,
                accepted: true,
            })),
        };
        const loopManager = {
            run: jest.fn(async () => createAgentLoopReport()),
        } as unknown as AgentLoopManager;
        const executionStageManager = {
            run: jest.fn(async () => ({
                agentLoopReport: createAgentLoopReport(),
                approvedPatchSet: createPatchSet(),
                branchPush: createBranchPush(),
            })),
        } as unknown as ExecutionStageManager;

        const coordinator = new ExecutionCoordinator(plugin, loopManager, executionStageManager);
        const result = await coordinator.execute(createPayload({
            isolatedEnvironmentPath: '/tmp/workspace',
            executionBranchName: 'devclaw/fix-plan-123',
        }));

        expect(executionStageManager.run).toHaveBeenCalledTimes(1);
        expect(loopManager.run).not.toHaveBeenCalled();
        expect(plugin.execute).not.toHaveBeenCalled();

        expect(result).toMatchObject({
            runRef: 'agent-runner-run-123',
            engine: 'agent-runner',
            accepted: true,
        });
        expect(result.approvedPatchSet?.patchSetRef).toBe('run-123:abc123');
        expect(result.branchPush?.pushed).toBe(true);
    });

    it('falls back to plugin dispatch when execution stage preconditions are missing', async () => {
        process.env.RUNNER_AGENT_LOOP_ENABLED = 'true';
        const plugin: ExecutionPlugin = {
            execute: jest.fn(async () => ({
                runRef: 'stub-run-123',
                engine: 'stub' as const,
                accepted: true,
            })),
        };
        const loopManager = {
            run: jest.fn(async () => createAgentLoopReport()),
        } as unknown as AgentLoopManager;
        const executionStageManager = {
            run: jest.fn(async () => null),
        } as unknown as ExecutionStageManager;

        const coordinator = new ExecutionCoordinator(plugin, loopManager, executionStageManager);
        const result = await coordinator.execute(createPayload({
            isolatedEnvironmentPath: undefined,
            executionBranchName: undefined,
        }));

        expect(executionStageManager.run).not.toHaveBeenCalled();
        expect(loopManager.run).toHaveBeenCalledTimes(1);
        expect(plugin.execute).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            runRef: 'stub-run-123',
            engine: 'stub',
            accepted: true,
            agentLoopReport: createAgentLoopReport(),
        });
    });
});
