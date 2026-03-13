import request from 'supertest';
import app from '../src/index';

describe('OpenClaw Gateway API', () => {
    it('should return 200 OK for the health check', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    describe('POST /api/ingress/message', () => {
        it('should return 400 if provider is missing', async () => {
            const res = await request(app)
                .post('/api/ingress/message')
                .send({ payload: { text: 'hello' } });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should return 400 if payload is missing', async () => {
            const res = await request(app)
                .post('/api/ingress/message')
                .send({ provider: 'telegram' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should ingest valid messages and return 200', async () => {
            const payload = {
                provider: 'telegram',
                payload: {
                    chatId: 123,
                    text: 'hello devclaw'
                }
            };

            const res = await request(app)
                .post('/api/ingress/message')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: 'Message ingested' });
        });

        it('should handle repos payload when user is not logged in', async () => {
            const payload = {
                provider: 'telegram',
                payload: {
                    chatId: 123,
                    text: '/repos',
                    type: 'repos'
                }
            };

            const res = await request(app)
                .post('/api/ingress/message')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toContain('You need to log in to GitHub first. Use /login to authenticate.');
        });

        it('should handle repo_link payload when user is not logged in', async () => {
            const payload = {
                provider: 'telegram',
                payload: {
                    chatId: 123,
                    text: '/repo owner/repo',
                    type: 'repo_link'
                }
            };

            const res = await request(app)
                .post('/api/ingress/message')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toContain('You need to log in to GitHub first before linking a repository');
        });

        it('should handle status payload', async () => {
            const payload = {
                provider: 'telegram',
                payload: {
                    chatId: 123,
                    text: '/status',
                    type: 'status'
                }
            };

            const res = await request(app)
                .post('/api/ingress/message')
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);

            // Allow both true and false depending on whether Supabase is configured and local test account exists.
            if (res.body.message.includes('Logged into GitHub')) {
                expect(res.body.message).toContain('Linked Repository');
            } else {
                // If not logged in, or if Supabase isn't configured
                expect(res.body.message).toMatch(/(Not logged into GitHub|Database not configured)/);
            }
        });
    });
});
