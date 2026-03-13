import { ArchitecturePlan } from '@coredev/contracts';

export type PlanPhaseStatus = 'planned' | 'ready' | 'blocked';

export interface OpenClawExecutionPhase {
    id: string;
    title: string;
    status: PlanPhaseStatus;
    details: string;
}

export interface OpenClawExecutionBlueprint {
    model: string;
    targetRepo: string;
    isolationProvider: string;
    branch: {
        strategy: 'feature_branch';
        baseBranch: string;
        name: string;
    };
    agentQueue: Array<{
        domain: 'frontend' | 'backend';
        generator: string;
        reviewer: string;
        status: PlanPhaseStatus;
    }>;
    phases: OpenClawExecutionPhase[];
}

export interface PlanRevisionEvent {
    revision: number;
    updatedAt: string;
    reason: string;
    source: string;
}

export interface OpenClawPlanRecord {
    plan: ArchitecturePlan;
    revision: number;
    source: string;
    createdAt: string;
    updatedAt: string;
    revisionHistory: PlanRevisionEvent[];
    blueprint: OpenClawExecutionBlueprint;
}

export interface CreatePlanInput {
    requestId: string;
    userId: string;
    repo: string;
    description: string;
    issueNumber?: number;
    repoFileTree?: string[];
}

export interface UpdatePlanInput {
    existingPlan: ArchitecturePlan;
    repo: string;
    changeRequest: string;
    context?: string;
    existingBlueprint?: OpenClawExecutionBlueprint;
}
