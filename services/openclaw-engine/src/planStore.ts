import { ArchitecturePlan } from '@devclaw/contracts';
import { OpenClawExecutionBlueprint, OpenClawPlanRecord } from './types';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SaveNewPlanInput {
    plan: ArchitecturePlan;
    source: string;
    blueprint: OpenClawExecutionBlueprint;
}

export interface SavePlanRevisionInput {
    planId: string;
    plan: ArchitecturePlan;
    source: string;
    reason: string;
    blueprint: OpenClawExecutionBlueprint;
}

class SupabasePlanStore {
    private supabase: SupabaseClient | null = null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        } else {
            console.warn('[PlanStore] Supabase credentials not found. Plan operations will fail.');
        }
    }

    async saveNewPlan(input: SaveNewPlanInput): Promise<OpenClawPlanRecord> {
        const now = new Date().toISOString();

        const record: OpenClawPlanRecord = {
            plan: input.plan,
            revision: 1,
            source: input.source,
            createdAt: now,
            updatedAt: now,
            revisionHistory: [
                {
                    revision: 1,
                    updatedAt: now,
                    reason: 'Initial architecture plan created',
                    source: input.source,
                },
            ],
            blueprint: input.blueprint,
        };

        if (this.supabase) {
            // Note: The orchestrator should have created a placeholder, but we upsert anyway to be safe
            // We stringify the record so it fits simply into 'plan_details' column as expected by DB schema
            const { error } = await this.supabase
                .from('task_runs')
                .update({
                    plan_details: JSON.stringify(record),
                    plan_id: input.plan.planId
                })
                .eq('plan_id', input.plan.planId);

            if (error) {
                console.error('[PlanStore] Error saving new plan to Supabase:', error.message);
                // Fallback attempt if exact plan_id doesn't exist yet but was expected 
                // In proper flow, Orchestrator creates issue and plan_id beforehand
            }
        }
        return record;
    }

    async getPlan(planId: string): Promise<OpenClawPlanRecord | null> {
        if (!this.supabase) return null;

        const { data, error } = await this.supabase
            .from('task_runs')
            .select('plan_details')
            .eq('plan_id', planId)
            .single();

        if (error || !data || !data.plan_details) {
            return null;
        }

        try {
            const parsed = typeof data.plan_details === 'string'
                ? JSON.parse(data.plan_details)
                : data.plan_details;

            // Handle legacy cases where plan_details only had ArchitecturePlan
            if (parsed.plan && parsed.revision) {
                return parsed as OpenClawPlanRecord;
            } else if (parsed.planId) {
                // Construct a mock record for old format
                return {
                    plan: parsed as ArchitecturePlan,
                    revision: 1,
                    source: 'unknown',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    revisionHistory: [],
                    // create a dummy blueprint
                    blueprint: {
                        model: 'unknown',
                        targetRepo: 'unknown',
                        isolationProvider: 'venice.ai',
                        branch: { strategy: 'feature_branch', baseBranch: 'main', name: 'unknown' },
                        agentQueue: [],
                        phases: []
                    }
                };
            }
            return null;
        } catch (e) {
            console.error('[PlanStore] Failed to parse plan_details json:', e);
            return null;
        }
    }

    async savePlanRevision(input: SavePlanRevisionInput): Promise<OpenClawPlanRecord | null> {
        if (!this.supabase) return null;

        const existing = await this.getPlan(input.planId);
        if (!existing) return null;

        const now = new Date().toISOString();
        const revision = existing.revision + 1;

        const updated: OpenClawPlanRecord = {
            ...existing,
            plan: input.plan,
            source: input.source,
            revision,
            updatedAt: now,
            revisionHistory: [
                ...existing.revisionHistory,
                {
                    revision,
                    updatedAt: now,
                    reason: input.reason,
                    source: input.source,
                },
            ],
            blueprint: input.blueprint,
        };

        const { error } = await this.supabase
            .from('task_runs')
            .update({ plan_details: JSON.stringify(updated) })
            .eq('plan_id', input.planId);

        if (error) {
            console.error('[PlanStore] Error saving plan revision to Supabase:', error.message);
            return null;
        }

        return updated;
    }
}

let storeInstance: SupabasePlanStore | null = null;

export const getPlanStore = (): SupabasePlanStore => {
    if (!storeInstance) {
        storeInstance = new SupabasePlanStore();
    }
    return storeInstance;
};
