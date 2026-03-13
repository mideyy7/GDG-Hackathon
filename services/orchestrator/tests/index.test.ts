import request from 'supertest';
import axios from 'axios';
import { ArchitecturePlan } from '@devclaw/contracts';
jest.mock('@supabase/supabase-js', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis(),
        single: jest.fn(),
        upsert: jest.fn().mockReturnThis(),
    };
    return {
        createClient: jest.fn(() => mockSupabase),
    };
});
import { createClient } from '@supabase/supabase-js';
// Simulate test environment vars so createClient is called
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'testkey';

import app from '../src/index';
import { createOrDedupeIssue } from '../src/githubClient';
import {
    buildExecutionSubTasks,
    provisionIsolatedExecutionEnvironment,
} from '../src/executionPreparation';

// Mock axios and githubClient so we don't make real HTTP calls
jest.mock('axios');
jest.mock('../src/githubClient');
jest.mock('../src/executionPreparation', () => ({
    buildExecutionSubTasks: jest.fn(() => [
        {
            id: 'plan-123-frontend',
            domain: 'frontend',
            agent: 'Frontend',
            objective: 'Fix login flow',
            files: ['apps/web/src/pages/Login.tsx'],
            generator: 'frontend-gen',
            reviewer: 'frontend-reviewer',
        },
    ]),
    provisionIsolatedExecutionEnvironment: jest.fn(async () => ({
        workspacePath: '/tmp/devclaw-isolated/runId',
        branchName: 'devclaw/fix-plan-123-login-flow',
        baseBranch: 'main',
    })),
    resolveApprovedPlan: jest.fn((details: any) => details?.plan || details),
    resolvePreferredExecutionBranch: jest.fn(() => ({
        branchName: 'devclaw/fix-plan-123-login-flow',
        baseBranch: 'main',
    })),
}));

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockedCreateOrDedupe = createOrDedupeIssue as jest.MockedFunction<typeof createOrDedupeIssue>;
const mockedBuildExecutionSubTasks = buildExecutionSubTasks as jest.MockedFunction<typeof buildExecutionSubTasks>;
const mockedProvisionIsolation = provisionIsolatedExecutionEnvironment as jest.MockedFunction<typeof provisionIsolatedExecutionEnvironment>;

const mockApprovedPlan: ArchitecturePlan = {
    planId: 'plan-123',
    requestId: 'req-abc',
    summary: 'Fix login flow',
    affectedFiles: ['apps/web/src/pages/Login.tsx', 'services/auth/src/login.ts'],
    agentAssignments: [
        { domain: 'frontend', generator: 'frontend-gen', reviewer: 'frontend-reviewer' },
        { domain: 'backend', generator: 'backend-gen', reviewer: 'backend-reviewer' },
    ],
    riskFlags: [],
    status: 'approved',
};

describe('Orchestrator API', () => {
    beforeEach(() => {
        // Ensure axios.post always returns a resolved promise by default
        // (prevents fire-and-forget approval card calls from crashing tests)
        mockedAxiosPost.mockResolvedValue({ data: {} });

        const mockSupabase = createClient('', '');
        ((mockSupabase as any).from as jest.Mock).mockReturnValue(mockSupabase);
        ((mockSupabase as any).select as jest.Mock).mockReturnValue(mockSupabase);
        ((mockSupabase as any).eq as jest.Mock).mockReturnValue(mockSupabase);
        ((mockSupabase as any).update as jest.Mock).mockReturnValue(mockSupabase);
        ((mockSupabase as any).match as jest.Mock).mockReturnValue(mockSupabase);
        ((mockSupabase as any).single as jest.Mock).mockImplementation(() => {
            // Depending on the mock, return valid task or github token
            return Promise.resolve({
                data: {
                    id: 'runId',
                    plan_id: 'plan-123',
                    github_token: 'ghtoken',
                    user_id: 'u1',
                    repo: 'owner/repo',
                    issue_number: 42,
                    issue_url: 'https://github.com/owner/repo/issues/42',
                    description: 'Fix login flow',
                    plan_details: mockApprovedPlan,
                },
                error: null,
            });
        });
        ((mockSupabase as any).upsert as jest.Mock).mockResolvedValue({ data: null, error: null });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ── Health Check ─────────────────────────────────────────────────────────

    it('GET /health → 200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok', service: 'orchestrator' });
    });

    // ── POST /api/task — Validation ───────────────────────────────────────────

    it('POST /api/task → 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/task')
            .send({ userId: 'u1', channel: 'telegram' }); // missing repo, githubToken, description
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('POST /api/task → 400 when repo format is missing or invalid', async () => {
        const res = await request(app).post('/api/task').send({
            userId: 'u1',
            channel: 'telegram',
            chatId: '123',
            repo: { owner: 'owner' }, // missing name
            message: 'Fix the login button',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Missing required fields/);
    });

    // ── POST /api/task — Issue Creation ───────────────────────────────────────

    it('POST /api/task → creates new GitHub issue and returns ACK', async () => {
        mockedCreateOrDedupe.mockResolvedValueOnce({
            number: 42,
            html_url: 'https://github.com/owner/repo/issues/42',
            isDuplicate: false,
        });
        // Supabase not configured in test env, so DB persistence will be skipped (warning only)

        const res = await request(app).post('/api/task').send({
            userId: 'u1',
            channel: 'telegram',
            chatId: '123',
            repo: { owner: 'owner', name: 'repo' },
            message: 'Fix the login button on mobile Safari',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.issueNumber).toBe(42);
        expect(res.body.issueUrl).toBe('https://github.com/owner/repo/issues/42');
        expect(res.body.message).toContain('Created new issue');
        expect(mockedCreateOrDedupe).toHaveBeenCalledWith(
            'ghtoken',
            'owner',
            'repo',
            expect.stringContaining('Fix the login button'),
            expect.any(String)
        );
    });

    it('POST /api/task → links to duplicate issue and returns ACK', async () => {
        mockedCreateOrDedupe.mockResolvedValueOnce({
            number: 7,
            html_url: 'https://github.com/owner/repo/issues/7',
            isDuplicate: true,
        });

        const res = await request(app).post('/api/task').send({
            userId: 'u1',
            channel: 'telegram',
            chatId: '123',
            repo: { owner: 'owner', name: 'repo' },
            message: 'Fix the login button on mobile Safari',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.issueNumber).toBe(7);
        expect(res.body.message).toContain('Linked to existing issue');
        expect(mockedCreateOrDedupe).toHaveBeenCalledTimes(1);
    });

    it('POST /api/task → 502 when GitHub API fails', async () => {
        mockedCreateOrDedupe.mockRejectedValueOnce(
            Object.assign(new Error('GitHub API error'), {
                response: { data: { message: 'Bad credentials' } },
            })
        );

        const res = await request(app).post('/api/task').send({
            userId: 'u1',
            channel: 'telegram',
            chatId: '123',
            repo: { owner: 'owner', name: 'repo' },
            message: 'Fix the login button',
        });

        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/GitHub issue/);
    });

    // ── POST /api/approve ───────────────────────────────────────────────────

    it('POST /api/approve → 400 when missing runId and planId', async () => {
        const res = await request(app).post('/api/approve').send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/approve → 200 and updates status', async () => {
        const res = await request(app).post('/api/approve').send({ planId: 'plan-123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Task approved and dispatched for execution');
        expect(res.body.execution).toBeDefined();
        expect(mockedBuildExecutionSubTasks).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan-123' }));
        expect(mockedProvisionIsolation).toHaveBeenCalledWith(expect.objectContaining({
            runId: 'runId',
            repoFullName: 'owner/repo',
        }));
        expect(mockedAxiosPost).toHaveBeenCalledWith(
            expect.stringContaining('/api/execute'),
            expect.objectContaining({
                runId: 'runId',
                planId: 'plan-123',
                isolatedEnvironmentPath: '/tmp/devclaw-isolated/runId',
                executionBranchName: 'devclaw/fix-plan-123-login-flow',
                executionSubTasks: expect.arrayContaining([
                    expect.objectContaining({
                        domain: 'frontend',
                        agent: 'Frontend',
                    }),
                ]),
            }),
            expect.objectContaining({
                timeout: expect.any(Number),
            })
        );
    });

    // ── POST /api/reject ────────────────────────────────────────────────────

    it('POST /api/reject → 400 when missing runId and planId', async () => {
        const res = await request(app).post('/api/reject').send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/reject → 200 and updates status', async () => {
        const res = await request(app).post('/api/reject').send({ planId: 'plan-123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Task rejected');
    });
});
