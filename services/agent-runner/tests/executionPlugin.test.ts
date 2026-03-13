import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DockerExecutionPlugin } from '../src/executionPlugin';

describe('DockerExecutionPlugin', () => {
    let workspacePath: string;

    beforeEach(async () => {
        workspacePath = await mkdtemp(path.join(os.tmpdir(), 'agent-runner-test-'));
    });

    afterEach(async () => {
        await rm(workspacePath, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    it('runs inside docker and removes the container on success', async () => {
        const calls: Array<{ args: string[]; options?: { timeoutMs?: number } }> = [];
        const runDocker = jest.fn(async (args: string[], options?: { timeoutMs?: number }) => {
            calls.push({ args, options });
            if (args[0] === 'run') {
                return { stdout: 'container-123\n', stderr: '' };
            }
            if (args[0] === 'wait') {
                return { stdout: '0\n', stderr: '' };
            }
            if (args[0] === 'logs') {
                return { stdout: 'done\n', stderr: '' };
            }
            if (args[0] === 'rm') {
                return { stdout: '', stderr: '' };
            }
            throw new Error(`Unexpected docker command: ${args.join(' ')}`);
        });

        const plugin = new DockerExecutionPlugin(runDocker);
        const result = await plugin.execute({
            runId: 'run-123',
            planId: 'plan-123',
            repo: 'owner/repo',
            executionBranchName: 'devclaw/fix-plan-123',
            isolatedEnvironmentPath: workspacePath,
        });

        expect(result).toEqual({
            runRef: 'docker-run-123',
            engine: 'docker',
            accepted: true,
        });

        expect(calls[0].args[0]).toBe('run');
        expect(calls[0].args).toContain(`${path.resolve(workspacePath)}:/workspace`);
        expect(calls[1].args).toEqual(['wait', 'container-123']);
        expect(calls[calls.length - 1].args).toEqual(['rm', '-f', 'container-123']);
    });

    it('throws when container exits non-zero and still removes it', async () => {
        const calls: Array<{ args: string[]; options?: { timeoutMs?: number } }> = [];
        const runDocker = jest.fn(async (args: string[], options?: { timeoutMs?: number }) => {
            calls.push({ args, options });
            if (args[0] === 'run') {
                return { stdout: 'container-bad\n', stderr: '' };
            }
            if (args[0] === 'wait') {
                return { stdout: '2\n', stderr: '' };
            }
            if (args[0] === 'logs') {
                return { stdout: 'build failed', stderr: '' };
            }
            if (args[0] === 'rm') {
                return { stdout: '', stderr: '' };
            }
            throw new Error(`Unexpected docker command: ${args.join(' ')}`);
        });

        const plugin = new DockerExecutionPlugin(runDocker);
        await expect(
            plugin.execute({
                runId: 'run-bad',
                isolatedEnvironmentPath: workspacePath,
            })
        ).rejects.toThrow(/status 2/);

        expect(calls[calls.length - 1].args).toEqual(['rm', '-f', 'container-bad']);
    });

    it('times out container wait and still force-removes it', async () => {
        const calls: Array<{ args: string[]; options?: { timeoutMs?: number } }> = [];
        const runDocker = jest.fn(async (args: string[], options?: { timeoutMs?: number }) => {
            calls.push({ args, options });
            if (args[0] === 'run') {
                return { stdout: 'container-timeout\n', stderr: '' };
            }
            if (args[0] === 'wait') {
                const timeoutErr: any = new Error('timed out');
                timeoutErr.code = 'ETIMEDOUT';
                throw timeoutErr;
            }
            if (args[0] === 'rm') {
                return { stdout: '', stderr: '' };
            }
            throw new Error(`Unexpected docker command: ${args.join(' ')}`);
        });

        const plugin = new DockerExecutionPlugin(runDocker);
        await expect(
            plugin.execute({
                runId: 'run-timeout',
                isolatedEnvironmentPath: workspacePath,
            })
        ).rejects.toThrow(/timed out/i);

        expect(calls[calls.length - 1].args).toEqual(['rm', '-f', 'container-timeout']);
    });

    it('fails fast when isolatedEnvironmentPath is missing', async () => {
        const runDocker = jest.fn();
        const plugin = new DockerExecutionPlugin(runDocker as any);

        await expect(
            plugin.execute({
                runId: 'run-123',
            })
        ).rejects.toThrow(/isolatedEnvironmentPath/);

        expect(runDocker).not.toHaveBeenCalled();
    });
});
