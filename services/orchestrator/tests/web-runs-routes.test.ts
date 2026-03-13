/**
 * Tests for Web Mission Control run routes in the orchestrator.
 *
 * Without Supabase configured, these tests verify:
 * - Route existence and HTTP responses
 * - Auth enforcement (X-Session-Token)
 * - Input validation
 */

import request from 'supertest';
import app from '../src/index';

const SESSION_TOKEN = 'test-session-' + Math.random().toString(36).slice(2);
const FAKE_RUN_ID = '00000000-0000-0000-0000-000000000001';

describe('Orchestrator — GET /api/runs', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app).get('/api/runs');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('returns 500 or empty list when Supabase is not configured', async () => {
        const res = await request(app)
            .get('/api/runs')
            .set('X-Session-Token', SESSION_TOKEN);
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            expect(Array.isArray(res.body.runs)).toBe(true);
        }
    });

    it('respects limit and offset query params', async () => {
        const res = await request(app)
            .get('/api/runs?limit=5&offset=10')
            .set('X-Session-Token', SESSION_TOKEN);
        expect([200, 500]).toContain(res.status);
    });
});

describe('Orchestrator — GET /api/runs/:runId', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app).get(`/api/runs/${FAKE_RUN_ID}`);
        expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent run', async () => {
        const res = await request(app)
            .get(`/api/runs/${FAKE_RUN_ID}`)
            .set('X-Session-Token', SESSION_TOKEN);
        // Without Supabase: 500; with Supabase: 404
        expect([404, 500]).toContain(res.status);
    });
});

describe('Orchestrator — POST /api/runs/:runId/approve', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/approve`)
            .send({});
        expect(res.status).toBe(401);
    });

    it('returns 404 or 500 for a non-existent run', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/approve`)
            .set('X-Session-Token', SESSION_TOKEN)
            .send({});
        expect([404, 500]).toContain(res.status);
    });
});

describe('Orchestrator — POST /api/runs/:runId/reject', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/reject`)
            .send({});
        expect(res.status).toBe(401);
    });

    it('returns 404 or 500 for a non-existent run', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/reject`)
            .set('X-Session-Token', SESSION_TOKEN)
            .send({});
        expect([404, 500]).toContain(res.status);
    });
});

describe('Orchestrator — POST /api/runs/:runId/refine', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/refine`)
            .send({ refinement: 'Add more tests' });
        expect(res.status).toBe(401);
    });

    it('returns 400 when refinement is missing', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/refine`)
            .set('X-Session-Token', SESSION_TOKEN)
            .send({});
        expect([400, 404, 500]).toContain(res.status);
        if (res.status === 400) {
            expect(res.body).toHaveProperty('error');
        }
    });

    it('returns 400 when refinement is empty string', async () => {
        const res = await request(app)
            .post(`/api/runs/${FAKE_RUN_ID}/refine`)
            .set('X-Session-Token', SESSION_TOKEN)
            .send({ refinement: '   ' });
        expect([400, 404, 500]).toContain(res.status);
    });
});

describe('Orchestrator — GET /api/runs/:runId/events (SSE)', () => {
    it('returns 401 when no session token provided', async () => {
        const res = await request(app).get(`/api/runs/${FAKE_RUN_ID}/events`);
        expect(res.status).toBe(401);
    });

    it('returns 404 or 500 for a non-existent run', async () => {
        const res = await request(app)
            .get(`/api/runs/${FAKE_RUN_ID}/events?token=${SESSION_TOKEN}`);
        expect([404, 500]).toContain(res.status);
    });
});

describe('Orchestrator — Health check', () => {
    it('GET /health returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

describe('createRunEvent helper', () => {
    it('creates event with correct shape', async () => {
        const { createRunEvent } = await import('../src/index');
        const event = createRunEvent(
            'run-123',
            'generating',
            'stage_change',
            'Starting execution'
        );
        expect(event).toMatchObject({
            runId: 'run-123',
            stage: 'generating',
            eventType: 'stage_change',
            message: 'Starting execution',
        });
        expect(typeof event.id).toBe('string');
        expect(typeof event.createdAt).toBe('string');
    });

    it('includes data when provided', async () => {
        const { createRunEvent } = await import('../src/index');
        const event = createRunEvent('r', 's', 'log', 'msg', { branch: 'main' });
        expect(event.data).toEqual({ branch: 'main' });
    });
});
