import { ChatRequest, ChatResponse } from '@devclaw/llm-router';
import {
    AgentPairFactoryRegistry,
    BackendAgentFactory,
    FrontendAgentFactory,
} from '../src/agentFactories';
import { AgentLoopManager } from '../src/agentLoopManager';
import { ExecutePayload, ExecutionSubTask } from '../src/executionPlugin';

const frontendSubTask: ExecutionSubTask = {
    id: 'plan-123-frontend',
    domain: 'frontend',
    agent: 'Frontend',
    objective: 'Improve mobile nav rendering',
    files: ['apps/dashboard/src/components/Nav.tsx'],
    generator: 'FrontendGenerator',
    reviewer: 'FrontendReviewer',
};

const createPayload = (subTasks: ExecutionSubTask[]): ExecutePayload => ({
    runId: 'run-123',
    requestId: 'req-123',
    planId: 'plan-123',
    executionSubTasks: subTasks,
});

describe('AgentLoopManager', () => {
    it('re-runs generator/reviewer until reviewer approves', async () => {
        let reviewCount = 0;
        const mockChat = jest.fn(async (request: ChatRequest): Promise<ChatResponse> => {
            if (request.role === 'frontend_generator') {
                return {
                    content: `generator output ${reviewCount + 1}`,
                    model: 'glm-4.7-flash',
                    provider: 'zai',
                };
            }

            if (request.role === 'frontend_reviewer') {
                reviewCount += 1;
                if (reviewCount === 1) {
                    return {
                        content: '{"decision":"REWRITE","notes":["Need better error handling"]}',
                        model: 'glm-4.7',
                        provider: 'zai',
                    };
                }
                return {
                    content: '{"decision":"APPROVED","notes":["Ready to ship"]}',
                    model: 'glm-4.7',
                    provider: 'zai',
                };
            }

            throw new Error(`Unexpected role ${request.role}`);
        });

        const registry = new AgentPairFactoryRegistry({
            frontendFactory: new FrontendAgentFactory(mockChat),
            backendFactory: new BackendAgentFactory(mockChat),
        });
        const manager = new AgentLoopManager(registry, 3);

        const report = await manager.run(createPayload([frontendSubTask]));

        expect(report).not.toBeNull();
        expect(report?.totalSubTasks).toBe(1);
        expect(report?.approvedSubTasks).toBe(1);
        expect(report?.subTasks[0].iterations).toBe(2);
        expect(report?.subTasks[0].finalDecision).toBe('APPROVED');
        expect(report?.subTasks[0].trace[0].generator.provider).toBe('zai');
        expect(report?.subTasks[0].trace[0].reviewer.provider).toBe('zai');

        expect(mockChat).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ role: 'frontend_generator' })
        );
        expect(mockChat).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ role: 'frontend_reviewer' })
        );
        expect(mockChat).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({ role: 'frontend_generator' })
        );
        expect(mockChat).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({ role: 'frontend_reviewer' })
        );
    });

    it('returns REWRITE when reviewer never approves within max iterations', async () => {
        const mockChat = jest.fn(async (request: ChatRequest): Promise<ChatResponse> => {
            if (request.role === 'backend_generator') {
                return {
                    content: 'backend output',
                    model: 'glm-4.7-flash',
                    provider: 'zai',
                };
            }

            if (request.role === 'backend_reviewer') {
                return {
                    content: '{"decision":"REWRITE","notes":["Add API validation"]}',
                    model: 'glm-4.7',
                    provider: 'zai',
                };
            }

            throw new Error(`Unexpected role ${request.role}`);
        });

        const backendSubTask: ExecutionSubTask = {
            ...frontendSubTask,
            id: 'plan-123-backend',
            domain: 'backend',
            agent: 'Backend',
            files: ['services/agent-runner/src/index.ts'],
            generator: 'BackendGenerator',
            reviewer: 'BackendReviewer',
        };
        const registry = new AgentPairFactoryRegistry({
            frontendFactory: new FrontendAgentFactory(mockChat),
            backendFactory: new BackendAgentFactory(mockChat),
        });
        const manager = new AgentLoopManager(registry, 2);

        const report = await manager.run(createPayload([backendSubTask]));

        expect(report).not.toBeNull();
        expect(report?.approvedSubTasks).toBe(0);
        expect(report?.rewriteRequiredSubTasks).toBe(1);
        expect(report?.subTasks[0].iterations).toBe(2);
        expect(report?.subTasks[0].finalDecision).toBe('REWRITE');
    });
});

