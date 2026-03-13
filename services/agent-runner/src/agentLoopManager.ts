import {
    AgentPairFactoryRegistry,
    ReviewerDecision,
} from './agentFactories';
import { ExecutePayload, ExecutionSubTask } from './executionPlugin';

export interface AgentLoopIterationResult {
    iteration: number;
    generator: {
        name: string;
        model: string;
        provider: string;
    };
    reviewer: {
        name: string;
        model: string;
        provider: string;
        decision: ReviewerDecision;
        notes: string[];
    };
}

export interface SubTaskLoopResult {
    subTaskId: string;
    domain: ExecutionSubTask['domain'];
    agent: ExecutionSubTask['agent'];
    iterations: number;
    finalDecision: ReviewerDecision;
    reviewerNotes: string[];
    trace: AgentLoopIterationResult[];
}

export interface AgentLoopReport {
    maxIterations: number;
    totalSubTasks: number;
    approvedSubTasks: number;
    rewriteRequiredSubTasks: number;
    subTasks: SubTaskLoopResult[];
}

const formatErrorMessage = (err: unknown): string => {
    if (!err) return 'unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveMaxIterations = (): number =>
    parsePositiveInt(process.env.RUNNER_AGENT_LOOP_MAX_ITERATIONS, 3);

export class AgentLoopManager {
    constructor(
        private readonly registry: AgentPairFactoryRegistry = new AgentPairFactoryRegistry(),
        private readonly maxIterations: number = resolveMaxIterations()
    ) { }

    async run(payload: ExecutePayload): Promise<AgentLoopReport | null> {
        const subTasks = payload.executionSubTasks || [];
        if (subTasks.length === 0) {
            return null;
        }

        const results: SubTaskLoopResult[] = [];
        for (const subTask of subTasks) {
            results.push(await this.runSubTaskLoop(payload, subTask));
        }

        const approvedSubTasks = results.filter((result) => result.finalDecision === 'APPROVED').length;
        return {
            maxIterations: this.maxIterations,
            totalSubTasks: results.length,
            approvedSubTasks,
            rewriteRequiredSubTasks: results.length - approvedSubTasks,
            subTasks: results,
        };
    }

    private async runSubTaskLoop(
        payload: ExecutePayload,
        subTask: ExecutionSubTask
    ): Promise<SubTaskLoopResult> {
        const pair = this.registry.createPair(subTask.domain);
        const trace: AgentLoopIterationResult[] = [];
        let reviewerNotes: string[] = [];
        let finalDecision: ReviewerDecision = 'REWRITE';

        for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
            let generation;
            try {
                generation = await pair.generator.run({
                    runId: payload.runId,
                    requestId: payload.requestId,
                    planId: payload.planId,
                    iteration,
                    subTask,
                    reviewerNotes,
                });
            } catch (err) {
                throw new Error(
                    `[AgentLoop] Generator failed for runId=${payload.runId} subTask=${subTask.id} ` +
                    `domain=${subTask.domain} iteration=${iteration} agent=${pair.generator.name}. ` +
                    `Reason: ${formatErrorMessage(err)}`
                );
            }

            let review;
            try {
                review = await pair.reviewer.run({
                    runId: payload.runId,
                    requestId: payload.requestId,
                    planId: payload.planId,
                    iteration,
                    subTask,
                    generation,
                });
            } catch (err) {
                throw new Error(
                    `[AgentLoop] Reviewer failed for runId=${payload.runId} subTask=${subTask.id} ` +
                    `domain=${subTask.domain} iteration=${iteration} agent=${pair.reviewer.name}. ` +
                    `Reason: ${formatErrorMessage(err)}`
                );
            }

            // Conditional logging for reviewer decision
            if (process.env.RUNNER_DEBUG) {
                console.log(`[AgentLoop][Debug] iteration=${iteration} reviewer decision=${review.decision}`);
            }
            finalDecision = review.decision;
            reviewerNotes = review.notes;

            trace.push({
                iteration,
                generator: {
                    name: pair.generator.name,
                    model: generation.model,
                    provider: generation.provider,
                },
                reviewer: {
                    name: pair.reviewer.name,
                    model: review.model,
                    provider: review.provider,
                    decision: review.decision,
                    notes: review.notes,
                },
            });

            if (review.decision === 'APPROVED') {
                break;
            }
        }

        return {
            subTaskId: subTask.id,
            domain: subTask.domain,
            agent: subTask.agent,
            iterations: trace.length,
            finalDecision,
            reviewerNotes,
            trace,
        };
    }
}
