import { ChatRequest, ChatResponse } from '@devclaw/llm-router';
import {
    BackendAgentFactory,
    FrontendAgentFactory,
} from '../src/agentFactories';
import { ExecutionSubTask } from '../src/executionPlugin';

const subTask: ExecutionSubTask = {
    id: 'plan-1-frontend',
    domain: 'frontend',
    agent: 'Frontend',
    objective: 'Fix responsive navbar behavior',
    files: ['apps/dashboard/src/components/Nav.tsx'],
    generator: 'FrontendGenerator',
    reviewer: 'FrontendReviewer',
};

const createMockChat = (): jest.MockedFunction<(request: ChatRequest) => Promise<ChatResponse>> =>
    jest.fn(async (request: ChatRequest): Promise<ChatResponse> => {
        if (request.role === 'frontend_reviewer' || request.role === 'backend_reviewer') {
            return {
                content: '{"decision":"APPROVED","notes":["Looks good"]}',
                model: 'glm-4.7',
                provider: 'zai',
            };
        }

        return {
            content: 'Proposed implementation output.',
            model: 'glm-4.7-flash',
            provider: 'zai',
        };
    });

describe('Agent factories', () => {
    it('FrontendAgentFactory routes generator/reviewer to frontend-specific roles', async () => {
        const mockChat = createMockChat();
        const factory = new FrontendAgentFactory(mockChat);
        const pair = factory.createPair();

        const generation = await pair.generator.run({
            runId: 'run-1',
            requestId: 'req-1',
            planId: 'plan-1',
            iteration: 1,
            subTask,
            reviewerNotes: [],
        });

        const review = await pair.reviewer.run({
            runId: 'run-1',
            requestId: 'req-1',
            planId: 'plan-1',
            iteration: 1,
            subTask,
            generation,
        });

        expect(mockChat).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ role: 'frontend_generator' })
        );
        expect(mockChat).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ role: 'frontend_reviewer' })
        );
        expect(generation.provider).toBe('zai');
        expect(review.provider).toBe('zai');
        expect(review.decision).toBe('APPROVED');
    });

    it('BackendAgentFactory routes generator/reviewer to backend-specific roles', async () => {
        const backendSubTask: ExecutionSubTask = {
            ...subTask,
            id: 'plan-1-backend',
            domain: 'backend',
            agent: 'Backend',
            generator: 'BackendGenerator',
            reviewer: 'BackendReviewer',
            files: ['services/orchestrator/src/index.ts'],
        };
        const mockChat = createMockChat();
        const factory = new BackendAgentFactory(mockChat);
        const pair = factory.createPair();

        const generation = await pair.generator.run({
            runId: 'run-2',
            requestId: 'req-2',
            planId: 'plan-2',
            iteration: 1,
            subTask: backendSubTask,
            reviewerNotes: ['Do not break API compatibility.'],
        });
        await pair.reviewer.run({
            runId: 'run-2',
            requestId: 'req-2',
            planId: 'plan-2',
            iteration: 1,
            subTask: backendSubTask,
            generation,
        });

        expect(mockChat).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ role: 'backend_generator' })
        );
        expect(mockChat).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ role: 'backend_reviewer' })
        );
    });
});

