import request from 'supertest';

process.env.RUNNER_ENGINE = 'stub';
import app from '../src/index';

describe('Agent Runner API', () => {
    it('GET /health -> 200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', service: 'agent-runner' });
    });

    it('POST /api/execute -> 400 when runId is missing', async () => {
        const res = await request(app).post('/api/execute').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/runId/);
    });

    it('POST /api/execute -> 202 and dispatch metadata', async () => {
        const res = await request(app).post('/api/execute').send({
            runId: 'run-123',
            planId: 'plan-123',
            requestId: 'req-123',
        });

        expect(res.status).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('dispatched');
        expect(res.body.runRef).toBe('stub-run-123');
        expect(res.body.engine).toBe('stub');
    });
});
