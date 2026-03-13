import request from 'supertest';
import axios from 'axios';

jest.mock('axios');
const mockPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockPlanRecords = new Map<string, any>();

jest.mock('../src/planStore', () => {
    const store = {
        saveNewPlan: jest.fn(async (input: any) => {
            const now = new Date().toISOString();
            const record = {
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
            mockPlanRecords.set(input.plan.planId, record);
            return record;
        }),
        getPlan: jest.fn(async (planId: string) => mockPlanRecords.get(planId) || null),
        savePlanRevision: jest.fn(async (input: any) => {
            const existing = mockPlanRecords.get(input.planId);
            if (!existing) {
                return null;
            }
            const now = new Date().toISOString();
            const revision = existing.revision + 1;
            const record = {
                ...existing,
                plan: input.plan,
                revision,
                source: input.source,
                updatedAt: now,
                revisionHistory: [
                    ...(existing.revisionHistory || []),
                    {
                        revision,
                        updatedAt: now,
                        reason: input.reason,
                        source: input.source,
                    },
                ],
                blueprint: input.blueprint,
            };
            mockPlanRecords.set(input.planId, record);
            return record;
        }),
    };

    return {
        getPlanStore: jest.fn(() => store),
    };
});

jest.mock('../src/openclawCliPlanner', () => ({
    createPlanWithOpenClawCli: jest.fn(async (_input: any) => ({
        summary: 'Mocked OpenClaw create summary',
        affectedFiles: ['services/orchestrator/src/index.ts'],
        agentAssignments: [
            {
                domain: 'backend',
                generator: 'BackendGenerator',
                reviewer: 'BackendReviewer',
            },
        ],
        riskFlags: ['Touches authentication/security paths'],
    })),
    revisePlanWithOpenClawCli: jest.fn(async (_input: any) => ({
        summary: 'Mocked OpenClaw revised summary',
        affectedFiles: ['services/orchestrator/src/index.ts', 'services/openclaw-gateway/src/index.ts'],
        agentAssignments: [
            {
                domain: 'backend',
                generator: 'BackendGenerator',
                reviewer: 'BackendReviewer',
            },
        ],
        riskFlags: ['Potential API contract changes'],
    })),
}));

import app from '../src/index';

describe('OpenClaw Engine API', () => {
    beforeEach(() => {
        mockPlanRecords.clear();
        jest.clearAllMocks();
    });

    it('GET /health -> 200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            status: 'ok',
            service: 'openclaw-engine',
        });
        expect(Array.isArray(res.body.capabilities)).toBe(true);
    });

    it('POST /api/plan -> 400 when required fields are missing', async () => {
        const res = await request(app).post('/api/plan').send({ requestId: 'req-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Missing required fields/);
    });

    it('POST /api/plan -> 200 with revision metadata and blueprint', async () => {
        const res = await request(app).post('/api/plan').send({
            requestId: 'req-a1111111',
            userId: 'u1',
            repo: 'owner/repo',
            description: 'Implement a new secure login callback endpoint',
            issueNumber: 55,
        });

        expect(res.status).toBe(200);
        expect(res.body.planId).toBe('plan-req-a111');
        expect(res.body.requestId).toBe('req-a1111111');
        expect(res.body.status).toBe('pending_approval');
        expect(res.body.revision).toBe(1);
        expect(Array.isArray(res.body.revisionHistory)).toBe(true);
        expect(res.body.blueprint).toBeDefined();
        expect(res.body.blueprint.branch.name).toContain('openclaw/');
    });

    it('GET /api/plan/:planId -> 200 for known plan', async () => {
        const created = await request(app).post('/api/plan').send({
            requestId: 'req-b2222222',
            userId: 'u2',
            repo: 'owner/repo',
            description: 'Improve mobile layout and add tests',
        });

        const planId = created.body.planId;
        const found = await request(app).get(`/api/plan/${planId}`);

        expect(found.status).toBe(200);
        expect(found.body.planId).toBe(planId);
        expect(found.body.revision).toBe(1);
        expect(found.body.blueprint.targetRepo).toBe('owner/repo');
    });

    it('POST /api/plan/:planId/update -> 404 for unknown plan', async () => {
        const res = await request(app).post('/api/plan/plan-missing/update').send({
            changeRequest: 'Please add rate limiting to all auth endpoints',
        });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Plan not found');
    });

    it('POST /api/plan/:planId/update -> 200 and increments revision', async () => {
        const created = await request(app).post('/api/plan').send({
            requestId: 'req-c3333333',
            userId: 'u3',
            repo: 'owner/repo',
            description: 'Refactor notifications service and improve error handling',
        });

        const planId = created.body.planId;
        const updated = await request(app).post(`/api/plan/${planId}/update`).send({
            changeRequest: 'Also add audit logging and stricter validation on payloads',
            context: 'This is required for compliance in Q2 launch.',
        });

        expect(updated.status).toBe(200);
        expect(updated.body.planId).toBe(planId);
        expect(updated.body.revision).toBe(2);
        expect(Array.isArray(updated.body.revisionHistory)).toBe(true);
        expect(updated.body.revisionHistory).toHaveLength(2);
        expect(updated.body.blueprint.phases).toHaveLength(5);
    });

    it('POST /api/execute -> 400 when runId is missing', async () => {
        const res = await request(app).post('/api/execute').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/runId/);
    });

    it('POST /api/execute -> 409 when source indicates recursive loop', async () => {
        const res = await request(app).post('/api/execute').send({
            runId: 'run-loop',
            source: 'agent-runner',
        });
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/loop detected/i);
    });

    it('POST /api/execute -> 202 and dispatch metadata', async () => {
        mockPost.mockResolvedValueOnce({
            data: {
                runRef: 'stub-run-123',
                engine: 'stub',
            },
        } as any);

        const res = await request(app).post('/api/execute').send({
            runId: 'run-123',
            planId: 'plan-123',
            source: 'orchestrator',
        });

        expect(res.status).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('dispatched');
        expect(res.body.runRef).toBe('stub-run-123');
        expect(res.body.engine).toBe('stub');
        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost.mock.calls[0][0]).toContain('/api/execute');
    });
});
