import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
    AgentPairFactory,
    AgentPairFactoryRegistry,
    GeneratorAgent,
    ReviewerAgent,
    ReviewerDecision,
} from '../src/agentFactories';
import { ExecutionStageManager } from '../src/executionStageManager';
import { ExecutePayload, ExecutionSubTask } from '../src/executionPlugin';

// ── Mock new production modules so tests don't require real API keys or Docker ─
jest.mock('../src/securityReviewer', () => ({
    SecurityReviewAgent: jest.fn().mockImplementation(() => ({
        scan: jest.fn().mockResolvedValue({
            passed: true,
            vulnerabilities: [],
            summary: 'No vulnerabilities found (mocked)',
            model: 'glm-4.7',
            provider: 'openrouter',
        }),
    })),
    SecurityVulnerabilityError: class SecurityVulnerabilityError extends Error {
        constructor(public result: unknown, public runId: string) { super('security_blocked'); }
    },
}));


interface GitCommandCall {
    args: string[];
    cwd: string;
}

interface MockGitState {
    branch: string;
    head: string;
    commitCount: number;
}

const createSubTask = (
    id: string,
    domain: ExecutionSubTask['domain'],
    filePath: string
): ExecutionSubTask => ({
    id,
    domain,
    agent: domain === 'frontend' ? 'Frontend' : 'Backend',
    objective: `Update ${domain} feature`,
    files: [filePath],
    generator: domain === 'frontend' ? 'FrontendGenerator' : 'BackendGenerator',
    reviewer: domain === 'frontend' ? 'FrontendReviewer' : 'BackendReviewer',
});

const createPayload = (
    workspacePath: string,
    subTasks: ExecutionSubTask[]
): ExecutePayload => ({
    runId: 'run-123',
    planId: 'plan-123',
    requestId: 'req-123',
    isolatedEnvironmentPath: workspacePath,
    executionBranchName: 'devclaw/fix-plan-123',
    executionSubTasks: subTasks,
});

const createRunGitMock = (calls: GitCommandCall[], state: MockGitState) =>
    jest.fn(async (args: string[], cwd: string) => {
        calls.push({ args, cwd });

        if (args[0] === 'config') {
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
            return { stdout: `${state.branch}\n`, stderr: '' };
        }
        if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
            return { stdout: `${state.head}\n`, stderr: '' };
        }
        if (args[0] === 'checkout') {
            state.branch = args[args.length - 1];
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'apply') {
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'add') {
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'diff' && args.includes('--cached') && args.includes('--name-only')) {
            return { stdout: 'apps/web/src/App.tsx\nservices/api/src/handler.ts\n', stderr: '' };
        }
        if (args[0] === 'diff' && args.includes('--cached')) {
            return { stdout: 'diff --git a/file b/file\n', stderr: '' };
        }
        if (args[0] === 'diff' && args[1]?.includes('..')) {
            return { stdout: 'combined patch output', stderr: '' };
        }
        if (args[0] === 'commit') {
            state.commitCount += 1;
            state.head = `commit-${state.commitCount}`;
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'show' && args.includes('--patch')) {
            const sha = args[args.length - 1];
            return { stdout: `patch for ${sha}`, stderr: '' };
        }
        if (args[0] === 'show' && args.includes('--name-only')) {
            return { stdout: 'apps/web/src/App.tsx\n', stderr: '' };
        }
        if (args[0] === 'push') {
            return { stdout: '', stderr: '' };
        }
        if (args[0] === 'reset' || args[0] === 'clean') {
            return { stdout: '', stderr: '' };
        }

        throw new Error(`Unexpected git command: ${args.join(' ')}`);
    });

const createFactory = (
    generatorName: string,
    reviewerName: string,
    decisionSequence: ReviewerDecision[],
    targetPath: string,
    generatorCalls: Array<{ subTaskId: string; snapshotsLength: number }>
): AgentPairFactory => {
    let reviewIndex = 0;
    const generator: GeneratorAgent = {
        name: generatorName,
        run: async (input) => {
            generatorCalls.push({
                subTaskId: input.subTask.id,
                snapshotsLength: input.fileSnapshots?.length || 0,
            });
            return {
                content: JSON.stringify({
                    summary: 'Apply requested change',
                    files: [
                        {
                            path: targetPath,
                            content: 'after\n',
                        },
                    ],
                    notes: ['Updated target file'],
                }),
                model: 'glm-4.7-flash',
                provider: 'zai',
            };
        },
    };

    const reviewer: ReviewerAgent = {
        name: reviewerName,
        run: async () => {
            const decision = decisionSequence[Math.min(reviewIndex, decisionSequence.length - 1)];
            reviewIndex += 1;
            return {
                decision,
                notes: decision === 'APPROVED' ? ['Looks good'] : ['Needs rewrite'],
                content: JSON.stringify({ decision, notes: ['review'] }),
                model: 'glm-4.7',
                provider: 'zai',
            };
        },
    };

    return {
        createPair: () => ({
            domain: generatorName.includes('Frontend') ? 'frontend' : 'backend',
            agent: generatorName.includes('Frontend') ? 'Frontend' : 'Backend',
            generator,
            reviewer,
        }),
    };
};

describe('ExecutionStageManager', () => {
    let workspacePath: string;

    beforeEach(async () => {
        workspacePath = await mkdtemp(path.join(os.tmpdir(), 'agent-runner-stage-'));
        await mkdir(path.join(workspacePath, 'apps/web/src'), { recursive: true });
        await mkdir(path.join(workspacePath, 'services/api/src'), { recursive: true });
        await writeFile(path.join(workspacePath, 'apps/web/src/App.tsx'), 'before\n', 'utf8');
        await writeFile(path.join(workspacePath, 'services/api/src/handler.ts'), 'before\n', 'utf8');
    });

    afterEach(async () => {
        await rm(workspacePath, { recursive: true, force: true });
    });

    it('routes frontend/backend subTasks to matching agent pairs, builds patch set, and pushes branch', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };
        const runGit = createRunGitMock(gitCalls, gitState);
        const generatorCalls: Array<{ subTaskId: string; snapshotsLength: number }> = [];

        const registry = new AgentPairFactoryRegistry({
            frontendFactory: createFactory(
                'FrontendGenerator',
                'FrontendReviewer',
                ['APPROVED'],
                'apps/web/src/App.tsx',
                generatorCalls
            ),
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                generatorCalls
            ),
        });

        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
            createSubTask('plan-backend', 'backend', 'services/api/src/handler.ts'),
        ]));

        expect(result).not.toBeNull();
        expect(result?.agentLoopReport.totalSubTasks).toBe(2);
        expect(result?.agentLoopReport.approvedSubTasks).toBe(2);
        expect(result?.approvedPatchSet.subTasks).toHaveLength(2);
        expect(result?.approvedPatchSet.branchName).toBe('devclaw/fix-plan-123');
        expect(result?.approvedPatchSet.patch).toBe('combined patch output');
        expect(result?.branchPush).toEqual({
            remote: 'origin',
            branchName: 'devclaw/fix-plan-123',
            headCommit: 'commit-2',
            pushed: true,
        });

        expect(generatorCalls).toEqual([
            { subTaskId: 'plan-frontend', snapshotsLength: 1 },
            { subTaskId: 'plan-backend', snapshotsLength: 1 },
        ]);

        expect(gitCalls.some((call) =>
            call.args[0] === 'push' &&
            call.args[1] === '--set-upstream' &&
            call.args[2] === 'origin' &&
            call.args[3] === 'devclaw/fix-plan-123'
        )).toBe(true);
    });

    it('resets workspace and retries when reviewer requests rewrite', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };
        const runGit = createRunGitMock(gitCalls, gitState);
        const generatorCalls: Array<{ subTaskId: string; snapshotsLength: number }> = [];

        const registry = new AgentPairFactoryRegistry({
            frontendFactory: createFactory(
                'FrontendGenerator',
                'FrontendReviewer',
                ['REWRITE', 'APPROVED'],
                'apps/web/src/App.tsx',
                generatorCalls
            ),
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                generatorCalls
            ),
        });

        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
        ]));

        expect(result?.agentLoopReport.subTasks[0].iterations).toBe(2);
        expect(generatorCalls).toHaveLength(2);

        expect(gitCalls.some((call) =>
            call.args[0] === 'reset' &&
            call.args[1] === '--hard' &&
            call.args[2] === 'HEAD'
        )).toBe(true);
        expect(gitCalls.some((call) =>
            call.args[0] === 'clean' &&
            call.args[1] === '-fd'
        )).toBe(true);
    });

    it('handles unborn HEAD by using empty tree and fallback reset', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };
        let headAvailable = false;

        const runGit = jest.fn(async (args: string[], cwd: string) => {
            gitCalls.push({ args, cwd });

            if (args[0] === 'config') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'branch' && args[1] === '--show-current') {
                return { stdout: `${gitState.branch}\n`, stderr: '' };
            }
            if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
                if (!headAvailable) {
                    throw new Error("fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.");
                }
                return { stdout: `${gitState.head}\n`, stderr: '' };
            }
            if (args[0] === 'apply') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'add') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached') && args.includes('--name-only')) {
                return { stdout: 'apps/web/src/App.tsx\nservices/api/src/handler.ts\n', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached')) {
                return { stdout: 'diff --git a/file b/file\n', stderr: '' };
            }
            if (args[0] === 'diff' && args[1]?.includes('..')) {
                return { stdout: 'combined patch output', stderr: '' };
            }
            if (args[0] === 'commit') {
                gitState.commitCount += 1;
                gitState.head = `commit-${gitState.commitCount}`;
                headAvailable = true;
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--patch')) {
                const sha = args[args.length - 1];
                return { stdout: `patch for ${sha}`, stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--name-only')) {
                return { stdout: 'apps/web/src/App.tsx\n', stderr: '' };
            }
            if (args[0] === 'push') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'reset' && args[1] === '--hard' && args[2] === 'HEAD') {
                throw new Error("fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.");
            }
            if (args[0] === 'reset' && args[1] === '--hard' && args.length === 2) {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'clean') {
                return { stdout: '', stderr: '' };
            }

            throw new Error(`Unexpected git command: ${args.join(' ')}`);
        });

        const generatorCalls: Array<{ subTaskId: string; snapshotsLength: number }> = [];
        const registry = new AgentPairFactoryRegistry({
            frontendFactory: createFactory(
                'FrontendGenerator',
                'FrontendReviewer',
                ['REWRITE', 'APPROVED'],
                'apps/web/src/App.tsx',
                generatorCalls
            ),
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                generatorCalls
            ),
        });

        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
        ]));

        expect(result?.approvedPatchSet.baseCommit).toBe('4b825dc642cb6eb9a060e54bf8d69288fbee4904');
        expect(gitCalls.some((call) =>
            call.args[0] === 'reset' &&
            call.args[1] === '--hard' &&
            call.args.length === 2
        )).toBe(true);
    });

    it('applies file rewrites and replaces placeholder branch names', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'unknown',
            head: 'base-commit',
            commitCount: 0,
        };
        const runGit = createRunGitMock(gitCalls, gitState);

        const frontendFactory: AgentPairFactory = {
            createPair: () => ({
                domain: 'frontend',
                agent: 'Frontend',
                generator: {
                    name: 'FrontendGenerator',
                    run: async () => ({
                        content: JSON.stringify({
                            summary: 'Apply patch',
                            files: [
                                {
                                    path: 'apps/web/src/App.tsx',
                                    content: 'after\n',
                                },
                            ],
                            notes: [],
                        }),
                        model: 'glm-4.7-flash',
                        provider: 'zai',
                    }),
                },
                reviewer: {
                    name: 'FrontendReviewer',
                    run: async () => ({
                        decision: 'APPROVED',
                        notes: ['Ready'],
                        content: '{"decision":"APPROVED","notes":["Ready"]}',
                        model: 'glm-4.7',
                        provider: 'zai',
                    }),
                },
            }),
        };

        const registry = new AgentPairFactoryRegistry({
            frontendFactory,
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                []
            ),
        });

        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);
        const result = await manager.run({
            ...createPayload(workspacePath, [
                createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
            ]),
            runId: 'run-abcdef12',
            executionBranchName: 'unknown',
        });

        expect(result?.approvedPatchSet.branchName).toBe('coredev/run-run-abcd');
        expect(gitCalls.some((call) =>
            call.args[0] === 'checkout' &&
            call.args[1] === '-B' &&
            call.args[2] === 'coredev/run-run-abcd'
        )).toBe(true);
        expect(gitCalls.some((call) =>
            call.args[0] === 'add' &&
            call.args[1] === '-A'
        )).toBe(true);
    });

    it('decodes patch payloads that use escaped newline literals in patch fallback mode', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };

        const runGit = jest.fn(async (args: string[], cwd: string) => {
            gitCalls.push({ args, cwd });

            if (args[0] === 'config') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'branch' && args[1] === '--show-current') {
                return { stdout: `${gitState.branch}\n`, stderr: '' };
            }
            if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
                return { stdout: `${gitState.head}\n`, stderr: '' };
            }
            if (args[0] === 'checkout') {
                gitState.branch = args[args.length - 1];
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'apply') {
                const patchPath = args[args.length - 1];
                const patchContent = await readFile(patchPath, 'utf8');
                if (!patchContent.includes('\n')) {
                    throw new Error('Git command failed (git apply): error: No valid patches in input');
                }
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'add') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached') && args.includes('--name-only')) {
                return { stdout: 'apps/web/src/App.tsx\n', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached')) {
                return { stdout: 'diff --git a/file b/file\n', stderr: '' };
            }
            if (args[0] === 'diff' && args[1]?.includes('..')) {
                return { stdout: 'combined patch output', stderr: '' };
            }
            if (args[0] === 'commit') {
                gitState.commitCount += 1;
                gitState.head = `commit-${gitState.commitCount}`;
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--patch')) {
                const sha = args[args.length - 1];
                return { stdout: `patch for ${sha}`, stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--name-only')) {
                return { stdout: 'apps/web/src/App.tsx\n', stderr: '' };
            }
            if (args[0] === 'push' || args[0] === 'reset' || args[0] === 'clean') {
                return { stdout: '', stderr: '' };
            }
            throw new Error(`Unexpected git command: ${args.join(' ')}`);
        });

        const frontendFactory: AgentPairFactory = {
            createPair: () => ({
                domain: 'frontend',
                agent: 'Frontend',
                generator: {
                    name: 'FrontendGenerator',
                    run: async () => ({
                        content: JSON.stringify({
                            summary: 'Apply patch',
                            patch: 'diff --git a/apps/web/src/App.tsx b/apps/web/src/App.tsx\\n--- a/apps/web/src/App.tsx\\n+++ b/apps/web/src/App.tsx\\n@@ -1 +1 @@\\n-before\\n+after',
                            notes: [],
                        }),
                        model: 'glm-4.7-flash',
                        provider: 'zai',
                    }),
                },
                reviewer: {
                    name: 'FrontendReviewer',
                    run: async () => ({
                        decision: 'APPROVED',
                        notes: ['Ready'],
                        content: '{"decision":"APPROVED","notes":["Ready"]}',
                        model: 'glm-4.7',
                        provider: 'zai',
                    }),
                },
            }),
        };

        const registry = new AgentPairFactoryRegistry({
            frontendFactory,
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                []
            ),
        });
        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
        ]));

        expect(result?.approvedPatchSet.subTasks).toHaveLength(1);
        expect(gitCalls.some((call) => call.args[0] === 'apply')).toBe(true);
    });

    it('extracts file rewrites even when generator JSON is malformed', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };
        const runGit = createRunGitMock(gitCalls, gitState);

        const frontendFactory: AgentPairFactory = {
            createPair: () => ({
                domain: 'frontend',
                agent: 'Frontend',
                generator: {
                    name: 'FrontendGenerator',
                    run: async () => ({
                        content: '{ "summary": "oops", "files": [{"path":"apps/web/src/App.tsx","content":"after\\n"}], "notes": ["ok"], }',
                        model: 'glm-4.7-flash',
                        provider: 'zai',
                    }),
                },
                reviewer: {
                    name: 'FrontendReviewer',
                    run: async () => ({
                        decision: 'APPROVED',
                        notes: ['Ready'],
                        content: '{"decision":"APPROVED","notes":["Ready"]}',
                        model: 'glm-4.7',
                        provider: 'zai',
                    }),
                },
            }),
        };

        const registry = new AgentPairFactoryRegistry({
            frontendFactory,
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                []
            ),
        });
        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
        ]));

        expect(result?.approvedPatchSet.subTasks).toHaveLength(1);
        expect(gitCalls.some((call) => call.args[0] === 'add')).toBe(true);
    });

    it('extracts file rewrites from JSON-like output with unescaped multiline content strings', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };
        const runGit = createRunGitMock(gitCalls, gitState);

        const frontendFactory: AgentPairFactory = {
            createPair: () => ({
                domain: 'frontend',
                agent: 'Frontend',
                generator: {
                    name: 'FrontendGenerator',
                    run: async () => ({
                        content: `{"summary":"Change CTA text color","notes":[],"files":[{"path":"apps/web/src/App.tsx","content":"import React from 'react';
export default function App() {
  return <button className='text-white'>Start the journey</button>;
}"}]}`,
                        model: 'glm-4.7-flash',
                        provider: 'zai',
                    }),
                },
                reviewer: {
                    name: 'FrontendReviewer',
                    run: async () => ({
                        decision: 'APPROVED',
                        notes: ['Ready'],
                        content: '{"decision":"APPROVED","notes":["Ready"]}',
                        model: 'glm-4.7',
                        provider: 'zai',
                    }),
                },
            }),
        };

        const registry = new AgentPairFactoryRegistry({
            frontendFactory,
            backendFactory: createFactory(
                'BackendGenerator',
                'BackendReviewer',
                ['APPROVED'],
                'services/api/src/handler.ts',
                []
            ),
        });
        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-frontend', 'frontend', 'apps/web/src/App.tsx'),
        ]));

        expect(result?.approvedPatchSet.subTasks).toHaveLength(1);
        expect(gitCalls.some((call) => call.args[0] === 'add')).toBe(true);
    });

    it('does not force backend rewrite when reviewer approves and staged diff is empty', async () => {
        const gitCalls: GitCommandCall[] = [];
        const gitState: MockGitState = {
            branch: 'devclaw/fix-plan-123',
            head: 'base-commit',
            commitCount: 0,
        };

        const runGit = jest.fn(async (args: string[], cwd: string) => {
            gitCalls.push({ args, cwd });

            if (args[0] === 'config') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'branch' && args[1] === '--show-current') {
                return { stdout: `${gitState.branch}\n`, stderr: '' };
            }
            if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
                return { stdout: `${gitState.head}\n`, stderr: '' };
            }
            if (args[0] === 'checkout') {
                gitState.branch = args[args.length - 1];
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'add') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached') && args.includes('--name-only')) {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'diff' && args.includes('--cached')) {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'diff' && args[1]?.includes('..')) {
                return { stdout: 'combined patch output', stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--patch')) {
                const sha = args[args.length - 1];
                return { stdout: `patch for ${sha}`, stderr: '' };
            }
            if (args[0] === 'show' && args.includes('--name-only')) {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'push' || args[0] === 'reset' || args[0] === 'clean') {
                return { stdout: '', stderr: '' };
            }
            if (args[0] === 'commit') {
                throw new Error('commit should not be called when there are no staged backend changes');
            }

            throw new Error(`Unexpected git command: ${args.join(' ')}`);
        });

        const backendFactory: AgentPairFactory = {
            createPair: () => ({
                domain: 'backend',
                agent: 'Backend',
                generator: {
                    name: 'BackendGenerator',
                    run: async () => ({
                        content: JSON.stringify({
                            summary: 'rewrite file',
                            files: [
                                {
                                    path: 'services/api/src/handler.ts',
                                    content: 'before\n',
                                },
                            ],
                            notes: [],
                        }),
                        model: 'glm-4.7-flash',
                        provider: 'zai',
                    }),
                },
                reviewer: {
                    name: 'BackendReviewer',
                    run: async (input) => {
                        expect(input.proposedPatch).toBeUndefined();
                        expect(input.workspaceDiff).toBeUndefined();
                        return {
                            decision: 'APPROVED',
                            notes: ['Looks good'],
                            content: '{"decision":"APPROVED","notes":["Looks good"]}',
                            model: 'glm-4.7',
                            provider: 'zai',
                        };
                    },
                },
            }),
        };

        const registry = new AgentPairFactoryRegistry({
            frontendFactory: createFactory(
                'FrontendGenerator',
                'FrontendReviewer',
                ['APPROVED'],
                'apps/web/src/App.tsx',
                []
            ),
            backendFactory,
        });

        const manager = new ExecutionStageManager(registry, runGit as any, 3, 8_000, 10, true);

        const result = await manager.run(createPayload(workspacePath, [
            createSubTask('plan-backend', 'backend', 'services/api/src/handler.ts'),
        ]));

        expect(result?.agentLoopReport.subTasks[0].finalDecision).toBe('APPROVED');
        expect(result?.approvedPatchSet.subTasks[0].commitSha).toBe('');
        expect(result?.approvedPatchSet.subTasks[0].filesChanged).toEqual([]);
        expect(gitCalls.some((call) => call.args[0] === 'commit')).toBe(false);
    });
});
