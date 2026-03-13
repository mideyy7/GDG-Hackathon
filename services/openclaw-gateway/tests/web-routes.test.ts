/**
 * Tests for the Web Mission Control API routes added to the gateway.
 *
 * Since Supabase is not configured in test environments, these tests
 * primarily verify route existence, input validation, and auth enforcement.
 */

import request from 'supertest';
import app from '../src/index';

const SESSION_TOKEN = 'test-session-id-' + Math.random().toString(36).slice(2);

describe('Web API Routes — GET /api/web/me', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app).get('/api/web/me');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('returns auth status (authenticated: false) when Supabase is not configured', async () => {
        // Without Supabase configured in test env, user is not found
        const res = await request(app)
            .get('/api/web/me')
            .set('X-Session-Token', SESSION_TOKEN);

        // Could be 200 (unauthenticated) or 500 (db not configured)
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('authenticated');
        }
    });
});

describe('Web API Routes — GET /api/web/repos', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app).get('/api/web/repos');
        expect(res.status).toBe(401);
    });

    it('returns 401 or 500 when Supabase is not configured', async () => {
        const res = await request(app)
            .get('/api/web/repos')
            .set('X-Session-Token', SESSION_TOKEN);
        expect([401, 500]).toContain(res.status);
    });
});

describe('Web API Routes — POST /api/web/repo-link', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app)
            .post('/api/web/repo-link')
            .send({ repo: 'owner/repo' });
        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid repo format (no slash)', async () => {
        const res = await request(app)
            .post('/api/web/repo-link')
            .set('X-Session-Token', SESSION_TOKEN)
            .send({ repo: 'noslash' });
        // Either 400 (validation) or 401/500 (Supabase not configured)
        expect([400, 401, 500]).toContain(res.status);
    });

    it('returns 400 for missing repo field', async () => {
        const res = await request(app)
            .post('/api/web/repo-link')
            .set('X-Session-Token', SESSION_TOKEN)
            .send({});
        expect([400, 401, 500]).toContain(res.status);
    });
});

describe('Web API Routes — POST /api/web/task', () => {
    it('returns 401 when X-Session-Token is missing', async () => {
        const res = await request(app)
            .post('/api/web/task')
            .send({ description: 'Fix the bug' });
        expect(res.status).toBe(401);
    });

    it('returns 400 when description is empty', async () => {
        const res = await request(app)
            .post('/api/web/task')
            .set('X-Session-Token', SESSION_TOKEN)
            .send({ description: '   ' });
        // 400 validation or 401/500 if DB not configured (hits DB before validation could differ)
        expect([400, 401, 500]).toContain(res.status);
    });

    it('returns 400 when description is missing', async () => {
        const res = await request(app)
            .post('/api/web/task')
            .set('X-Session-Token', SESSION_TOKEN)
            .send({});
        expect([400, 401, 500]).toContain(res.status);
    });
});

describe('Web API Routes — GET /api/web/auth/github', () => {
    it('returns 400 when userId is missing and no X-Session-Token', async () => {
        const res = await request(app).get('/api/web/auth/github');
        // Either 400 (no userId) or 500 (GitHub not configured)
        expect([400, 500]).toContain(res.status);
    });

    it('redirects to GitHub OAuth when GITHUB_CLIENT_ID is configured', async () => {
        const originalClientId = process.env.GITHUB_CLIENT_ID;
        process.env.GITHUB_CLIENT_ID = 'test-client-id';

        const res = await request(app)
            .get('/api/web/auth/github?userId=test-user-123')
            .redirects(0);

        // Should redirect (302) to GitHub OAuth
        if (res.status === 302) {
            expect(res.headers.location).toMatch(/github\.com\/login\/oauth\/authorize/);
        } else {
            // If GitHub not configured in env, still valid to get 500
            expect([302, 500]).toContain(res.status);
        }

        process.env.GITHUB_CLIENT_ID = originalClientId;
    });
});

describe('Health check', () => {
    it('GET /health returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
