import { AgentLoopManager, AgentLoopReport } from './agentLoopManager';
import { ExecutionStageManager } from './executionStageManager';
import {
    ApprovedPatchSet,
    BranchPushResult,
    ExecuteDispatch,
    ExecutePayload,
    ExecutionPlugin,
} from './executionPlugin';

const isAgentLoopEnabled = (): boolean => {
    const value = process.env.RUNNER_AGENT_LOOP_ENABLED;
    if (typeof value !== 'string') {
        return true;
    }
    return value.trim().toLowerCase() !== 'false';
};

export interface CoordinatedExecuteResult extends ExecuteDispatch {
    agentLoopReport?: AgentLoopReport;
    approvedPatchSet?: ApprovedPatchSet;
    branchPush?: BranchPushResult;
}

export class ExecutionCoordinator {
    constructor(
        private readonly executionPlugin: ExecutionPlugin,
        private readonly loopManager: AgentLoopManager = new AgentLoopManager(),
        private readonly executionStageManager: ExecutionStageManager = new ExecutionStageManager()
    ) { }

    async execute(payload: ExecutePayload): Promise<CoordinatedExecuteResult> {
        const shouldRunExecutionStage =
            Boolean(payload.executionSubTasks?.length) &&
            typeof payload.isolatedEnvironmentPath === 'string' &&
            payload.isolatedEnvironmentPath.trim().length > 0;

        if (shouldRunExecutionStage) {
            console.log(
                `[AgentRunner][Coordinator] Running full execution stage for runId=${payload.runId}`
            );
            const executionStageResult = await this.executionStageManager.run(payload);
            if (!executionStageResult) {
                throw new Error(
                    `Execution stage did not return results for runId=${payload.runId}.`
                );
            }

            return {
                runRef: `agent-runner-${payload.runId}`,
                engine: 'agent-runner',
                accepted: true,
                agentLoopReport: executionStageResult.agentLoopReport,
                approvedPatchSet: executionStageResult.approvedPatchSet,
                branchPush: executionStageResult.branchPush,
            };
        }

        const agentLoopReport =
            isAgentLoopEnabled() && payload.executionSubTasks?.length
                ? await this.loopManager.run(payload)
                : null;

        const dispatchPayload = agentLoopReport
            ? {
                ...payload,
                agentLoopReport,
            }
            : payload;
        const dispatch = await this.executionPlugin.execute(dispatchPayload);

        return {
            ...dispatch,
            ...(agentLoopReport ? { agentLoopReport } : {}),
        };
    }
}
