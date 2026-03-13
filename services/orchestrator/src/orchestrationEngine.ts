import axios from 'axios';
import { ArchitecturePlan, IntakeRequest } from '@devclaw/contracts';
import { ExecutionSubTask } from './executionPreparation';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ORCHESTRATOR_PLAN_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_PLAN_TIMEOUT_MS,
    20 * 60 * 1000
);
const ORCHESTRATOR_REFINE_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_REFINE_TIMEOUT_MS,
    20 * 60 * 1000
);
const ORCHESTRATOR_EXECUTE_TIMEOUT_MS = parsePositiveInt(
    process.env.ORCHESTRATOR_EXECUTE_TIMEOUT_MS,
    4 * 60 * 60 * 1000
);

export interface PlanInput {
    intake: IntakeRequest;
    repoFullName: string;
    issueNumber: number;
    repoFileTree?: string[];
}

export interface RefineInput {
    planId: string;
    repoFullName: string;
    changeRequest: string;
    issueNumber?: number;
}

export interface ExecuteInput {
    runId: string;
    planId?: string;
    requestId?: string;
    userId?: string;
    repo?: string;
    issueNumber?: number;
    issueUrl?: string;
    description?: string;
    planDetails?: ArchitecturePlan;
    executionSubTasks?: ExecutionSubTask[];
    isolatedEnvironmentPath?: string;
    executionBranchName?: string;
    progressChatId?: string;
    progressBotUrl?: string;
    progressCallbackUrl?: string;
}

export interface ExecuteResult {
    dispatched: boolean;
    engine: 'legacy' | 'openclaw';
    runRef?: string;
    approvedPatchSet?: unknown;
    branchPush?: unknown;
    agentLoop?: unknown;
}

/**
 * The core orchestration interface that bridges the intake requests with
 * both architecture planning and code execution stages.
 * 
 * Note: Planning is exclusively handled by OpenClawPlanningEngine, whereas 
 * execution can be deferred to either LegacyExecutionEngine or OpenClawExecutionEngine.
 */
export interface OrchestrationEngine {
    /** Generates an architecture plan based on an intake request via the OpenClaw Engine */
    plan(input: PlanInput): Promise<ArchitecturePlan>;

    /** Updates an existing architecture plan with refining instructions array via the OpenClaw Engine */
    refine(input: RefineInput): Promise<ArchitecturePlan>;

    /** Dispatches an approved plan to an execution engine for code generation */
    execute(input: ExecuteInput): Promise<ExecuteResult>;
}

/**
 * A legacy adapter for dispatching code execution requests to the old `AGENT_RUNNER_URL`
 * component (historically listening on port 3030).
 */
class LegacyExecutionEngine {
    async execute(input: ExecuteInput): Promise<ExecuteResult> {
        console.log('================================================================================');
        console.log('🚀 Orchestrator is using LEGACY engine for execution');
        console.log('================================================================================');
        const runnerUrl = process.env.AGENT_RUNNER_URL || 'http://localhost:3030';
        const execRes = await axios.post(`${runnerUrl}/api/execute`, {
            runId: input.runId,
            planId: input.planId,
            requestId: input.requestId,
            userId: input.userId,
            repo: input.repo,
            issueNumber: input.issueNumber,
            issueUrl: input.issueUrl,
            description: input.description,
            plan: input.planDetails,
            executionSubTasks: input.executionSubTasks,
            isolatedEnvironmentPath: input.isolatedEnvironmentPath,
            executionBranchName: input.executionBranchName,
            progressChatId: input.progressChatId,
            progressBotUrl: input.progressBotUrl,
            progressCallbackUrl: input.progressCallbackUrl,
        }, {
            timeout: ORCHESTRATOR_EXECUTE_TIMEOUT_MS,
        });

        return {
            dispatched: true,
            engine: 'legacy',
            runRef: execRes.data?.runRef || input.runId,
            approvedPatchSet: execRes.data?.approvedPatchSet,
            branchPush: execRes.data?.branchPush,
            agentLoop: execRes.data?.agentLoop,
        };
    }
}

/**
 * The dedicated planning engine using the internal `openclaw-engine` service API.
 * This replaced the legacy `architecture-planner` service. It connects to the 
 * OpenAPI planner endpoint (`/api/plan`).
 */
class OpenClawPlanningEngine {
    private readonly baseUrl = process.env.OPENCLAW_ENGINE_URL || 'http://localhost:3040';
    private readonly planPath = process.env.OPENCLAW_PLAN_PATH || '/api/plan';

    async plan(input: PlanInput): Promise<ArchitecturePlan> {
        console.log('================================================================================');
        console.log('🚀 Orchestrator is using OPENCLAW engine for planning');
        console.log('================================================================================');
        const planRes = await axios.post(`${this.baseUrl}${this.planPath}`, {
            requestId: input.intake.requestId,
            userId: input.intake.userId,
            repo: input.repoFullName,
            description: input.intake.message,
            issueNumber: input.issueNumber,
            source: 'orchestrator',
            repoFileTree: input.repoFileTree,
        }, {
            timeout: ORCHESTRATOR_PLAN_TIMEOUT_MS,
        });
        return planRes.data;
    }

    async refine(input: RefineInput): Promise<ArchitecturePlan> {
        console.log('================================================================================');
        console.log(`🚀 Orchestrator is using OPENCLAW engine to refine plan ${input.planId}`);
        console.log('================================================================================');
        const refineRes = await axios.post(`${this.baseUrl}${this.planPath}/${input.planId}/update`, {
            changeRequest: input.changeRequest,
            repo: input.repoFullName,
            source: 'orchestrator',
        }, {
            timeout: ORCHESTRATOR_REFINE_TIMEOUT_MS,
        });
        return refineRes.data;
    }
}

/**
 * The next-generation execution engine, intended to leverage the OpenClaw 
 * execution pipeline once implemented, connecting directly to `OPENCLAW_ENGINE_URL`.
 */
class OpenClawExecutionEngine {
    private readonly baseUrl = process.env.OPENCLAW_ENGINE_URL || 'http://localhost:3040';
    private readonly executePath = process.env.OPENCLAW_EXECUTE_PATH || '/api/execute';

    async execute(input: ExecuteInput): Promise<ExecuteResult> {
        console.log('================================================================================');
        console.log('🚀 Orchestrator is using OPENCLAW engine for execution');
        console.log('================================================================================');
        const execRes = await axios.post(`${this.baseUrl}${this.executePath}`, {
            runId: input.runId,
            planId: input.planId,
            requestId: input.requestId,
            userId: input.userId,
            repo: input.repo,
            issueNumber: input.issueNumber,
            issueUrl: input.issueUrl,
            description: input.description,
            plan: input.planDetails,
            executionSubTasks: input.executionSubTasks,
            isolatedEnvironmentPath: input.isolatedEnvironmentPath,
            executionBranchName: input.executionBranchName,
            progressChatId: input.progressChatId,
            progressBotUrl: input.progressBotUrl,
            progressCallbackUrl: input.progressCallbackUrl,
            source: 'orchestrator',
        }, {
            timeout: ORCHESTRATOR_EXECUTE_TIMEOUT_MS,
        });

        return {
            dispatched: true,
            engine: 'openclaw',
            runRef: execRes.data?.runRef || input.runId,
            approvedPatchSet: execRes.data?.approvedPatchSet,
            branchPush: execRes.data?.branchPush,
            agentLoop: execRes.data?.agentLoop,
        };
    }
}

class CombinedOrchestrationEngine implements OrchestrationEngine {
    constructor(
        private readonly planning: OpenClawPlanningEngine,
        private readonly execution: LegacyExecutionEngine | OpenClawExecutionEngine
    ) { }

    plan(input: PlanInput): Promise<ArchitecturePlan> {
        return this.planning.plan(input);
    }

    refine(input: RefineInput): Promise<ArchitecturePlan> {
        return this.planning.refine(input);
    }

    execute(input: ExecuteInput): Promise<ExecuteResult> {
        return this.execution.execute(input);
    }
}

/**
 * Factory and Dependency Injection container for the generic OrchestrationEngine.
 * Determines runtime engines dynamically based on feature flags (environment variables).
 * 
 * Flow:
 * - Always binds `OpenClawPlanningEngine` for `plan()` calls.
 * - Examines `EXECUTION_ENGINE` (falls back to `ORCHESTRATION_ENGINE` default) to
 *   select either legacy agent-runner or modern openclaw execution for `execute()`.
 */
export const getOrchestrationEngine = (): OrchestrationEngine => {
    const defaultEngine = (process.env.ORCHESTRATION_ENGINE || 'legacy').toLowerCase();
    const executionEngine = (process.env.EXECUTION_ENGINE || defaultEngine).toLowerCase();

    const planning = new OpenClawPlanningEngine();

    const execution = executionEngine === 'openclaw'
        ? new OpenClawExecutionEngine()
        : new LegacyExecutionEngine();

    return new CombinedOrchestrationEngine(planning, execution);
};
// trigger reload
