import { ArchitecturePlan } from '@devclaw/contracts';
import {
    createPlanWithOpenClawCli,
    revisePlanWithOpenClawCli,
} from './openclawCliPlanner';
import {
    CreatePlanInput,
    OpenClawExecutionBlueprint,
    UpdatePlanInput,
} from './types';

export interface PlanningResult {
    plan: ArchitecturePlan;
    blueprint: OpenClawExecutionBlueprint;
}

export interface OpenClawPlanningEngine {
    createPlan(input: CreatePlanInput): Promise<PlanningResult>;
    updatePlan(input: UpdatePlanInput): Promise<PlanningResult>;
}

const sanitizeBranchToken = (value: string): string => {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 42);
    return normalized || 'task';
};

const buildBranchName = (planId: string, description: string, preferred?: string): string => {
    if (preferred && preferred.trim()) {
        return preferred.trim();
    }
    return `openclaw/${planId.replace(/^plan-/, '')}-${sanitizeBranchToken(description)}`;
};

const toExecutionBlueprint = (
    plan: ArchitecturePlan,
    repo: string,
    description: string,
    previousBlueprint?: OpenClawExecutionBlueprint
): OpenClawExecutionBlueprint => {
    const isolationProvider = process.env.OPENCLAW_ISOLATION_PROVIDER || 'venice.ai';
    const baseBranch = process.env.OPENCLAW_BASE_BRANCH || 'main';
    const model = process.env.ZAI_GLM_MODEL || 'glm-4.7';
    const branchName = buildBranchName(plan.planId, description, previousBlueprint?.branch.name);

    return {
        model,
        targetRepo: repo,
        isolationProvider,
        branch: {
            strategy: 'feature_branch',
            baseBranch,
            name: branchName,
        },
        agentQueue: plan.agentAssignments.map((assignment) => ({
            ...assignment,
            status: 'planned',
        })),
        phases: [
            {
                id: 'planning',
                title: 'Architecture planning',
                status: 'ready',
                details: 'Plan generated and approved for orchestration review.',
            },
            {
                id: 'isolation',
                title: 'Create isolated workspace',
                status: 'planned',
                details: `Provision workspace via ${isolationProvider}.`,
            },
            {
                id: 'branch',
                title: 'Create implementation branch',
                status: 'planned',
                details: `Create branch ${branchName} from ${baseBranch}.`,
            },
            {
                id: 'implementation',
                title: 'Run generator/reviewer loop',
                status: 'planned',
                details: 'Dispatch generator and reviewer agents per domain assignments.',
            },
            {
                id: 'delivery',
                title: 'Push changes and notify user',
                status: 'planned',
                details: 'Push commits, open PR, and send completion update back to user.',
            },
        ],
    };
};

class DefaultOpenClawPlanningEngine implements OpenClawPlanningEngine {
    async createPlan(input: CreatePlanInput): Promise<PlanningResult> {
        const planned = await createPlanWithOpenClawCli({
            requestId: input.requestId,
            userId: input.userId,
            repo: input.repo,
            description: input.description,
            issueNumber: input.issueNumber,
            repoFileTree: input.repoFileTree,
        });
        const plan: ArchitecturePlan = {
            planId: `plan-${input.requestId.slice(0, 8)}`,
            requestId: input.requestId,
            summary: planned.summary,
            affectedFiles: planned.affectedFiles,
            agentAssignments: planned.agentAssignments,
            riskFlags: planned.riskFlags,
            status: 'pending_approval',
        };

        return {
            plan,
            blueprint: toExecutionBlueprint(plan, input.repo, input.description),
        };
    }

    async updatePlan(input: UpdatePlanInput): Promise<PlanningResult> {
        const revised = await revisePlanWithOpenClawCli({
            existingPlan: input.existingPlan,
            repo: input.repo,
            changeRequest: input.changeRequest,
            context: input.context,
        });
        const plan: ArchitecturePlan = {
            planId: input.existingPlan.planId,
            requestId: input.existingPlan.requestId,
            summary: revised.summary,
            affectedFiles: revised.affectedFiles,
            agentAssignments: revised.agentAssignments,
            riskFlags: revised.riskFlags,
            status: 'pending_approval',
        };

        return {
            plan,
            blueprint: toExecutionBlueprint(
                plan,
                input.repo,
                input.changeRequest,
                input.existingBlueprint
            ),
        };
    }
}

let planningEngineInstance: OpenClawPlanningEngine | null = null;

export const getOpenClawPlanningEngine = (): OpenClawPlanningEngine => {
    if (!planningEngineInstance) {
        planningEngineInstance = new DefaultOpenClawPlanningEngine();
    }
    return planningEngineInstance;
};
