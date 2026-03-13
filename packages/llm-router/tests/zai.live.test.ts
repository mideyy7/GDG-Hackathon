/**
 * zai.live.test.ts
 *
 * Live integration tests against the real Z.AI GLM API.
 * These tests are skipped unless ZAI_API_KEY is set in the environment.
 *
 * Run explicitly:
 *   ZAI_API_KEY=<key> npx jest tests/zai.live.test.ts --no-coverage
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load the llm-router .env so ZAI_API_KEY is available
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { chat } from '../src/index';

const hasKey = !!process.env.ZAI_API_KEY;
const describeIf = hasKey ? describe : describe.skip;

// Increase timeout — GLM reasoning models can take a few seconds
jest.setTimeout(60_000);

describeIf('Live Z.AI GLM API', () => {

    it('glm-4.7-flash (generator role) returns a non-empty response', async () => {
        const result = await chat({
            role: 'generator',
            messages: [
                { role: 'user', content: 'Reply with exactly: DEVCLAW_OK' },
            ],
            temperature: 0,
            maxTokens: 20,
            requestId: 'live-generator-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.model).toMatch(/glm/i);
        expect(result.content.length).toBeGreaterThan(0);
        console.log('[live] generator response:', result.content.trim());
    });

    it('glm-4.7-flash (reviewer role) returns a JSON review decision', async () => {
        const result = await chat({
            role: 'reviewer',
            messages: [
                {
                    role: 'user',
                    content: 'Review this code: `const x = 1 + 1;`. Respond with valid JSON: {"decision":"APPROVED","notes":[]}',
                },
            ],
            temperature: 0,
            maxTokens: 100,
            requestId: 'live-reviewer-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.content.length).toBeGreaterThan(0);

        // Try to parse the JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            expect(['APPROVED', 'REWRITE', 'REJECTED']).toContain(parsed.decision);
        }
        console.log('[live] reviewer response:', result.content.trim());
    });

    it('glm-z1-flash (orchestrator role — reasoning model) responds coherently', async () => {
        const result = await chat({
            role: 'orchestrator',
            messages: [
                {
                    role: 'user',
                    content: [
                        'You are an AI agent coordinator. A developer asked: "add a dark mode toggle".',
                        'Reply with exactly one word: ACKNOWLEDGED',
                    ].join('\n'),
                },
            ],
            temperature: 0,
            maxTokens: 50,
            requestId: 'live-orchestrator-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.content.length).toBeGreaterThan(0);
        console.log('[live] orchestrator response:', result.content.trim());
    });

    it('glm-4-long (planner role — long context) produces a plan', async () => {
        const result = await chat({
            role: 'planner',
            messages: [
                {
                    role: 'user',
                    content: 'List 3 files you would change to add a dark mode toggle to a React app. Reply as a JSON array of strings.',
                },
            ],
            temperature: 0.2,
            maxTokens: 150,
            requestId: 'live-planner-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.content.length).toBeGreaterThan(0);

        const jsonMatch = result.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThan(0);
        }
        console.log('[live] planner response:', result.content.trim());
    });

    it('glm-z1-flash (prospect_qualifier role) scores a company fit', async () => {
        const result = await chat({
            role: 'prospect_qualifier',
            messages: [
                {
                    role: 'user',
                    content: [
                        'Does this company fit a developer productivity SaaS?',
                        'Company: TechStartup, 10 engineers, builds web apps.',
                        'Reply ONLY with valid JSON, no explanation. Example: {"fit_score": 85, "reason": "Good fit because they build web apps."}',
                    ].join('\n'),
                },
            ],
            temperature: 0.2,
            maxTokens: 100,
            requestId: 'live-qualifier-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.content.length).toBeGreaterThan(0);

        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            expect(typeof parsed.fit_score).toBe('number');
            expect(parsed.fit_score).toBeGreaterThanOrEqual(0);
            expect(parsed.fit_score).toBeLessThanOrEqual(100);
        }
        console.log('[live] prospect_qualifier response:', result.content.trim());
    });

    it('glm-4.7-flash (outreach_writer role) generates a LinkedIn message', async () => {
        const result = await chat({
            role: 'outreach_writer',
            messages: [
                {
                    role: 'user',
                    content: 'Write a 2-sentence LinkedIn connection message to a startup CTO about DevClaw, an AI coding assistant.',
                },
            ],
            temperature: 0.7,
            maxTokens: 120,
            requestId: 'live-outreach-test',
        });

        expect(result.provider).toBe('zai');
        expect(result.content.length).toBeGreaterThan(20);
        console.log('[live] outreach_writer response:', result.content.trim());
    });

    it('provider field is always zai for all roles', async () => {
        const roles = ['generator', 'reviewer', 'frontend_generator', 'backend_generator'] as const;
        for (const role of roles) {
            const result = await chat({
                role,
                messages: [{ role: 'user', content: 'Say: OK' }],
                temperature: 0,
                maxTokens: 10,
                requestId: `live-provider-check-${role}`,
            });
            expect(result.provider).toBe('zai');
            expect(result.model).toMatch(/glm/i);
        }
    });
});
