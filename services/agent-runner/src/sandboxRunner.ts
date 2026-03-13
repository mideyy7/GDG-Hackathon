import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SandboxTestResult {
    passed: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    /** Combined trimmed output for feeding back to the generator */
    combinedOutput: string;
    skipped: boolean;
    skipReason?: string;
}

const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || 'node:22-bookworm-slim';
const SANDBOX_TIMEOUT_MS = Number.parseInt(process.env.SANDBOX_TIMEOUT_MS || '120000', 10);
const SANDBOX_BUILD_CMD = process.env.SANDBOX_BUILD_CMD || 'npm install --prefer-offline 2>&1 && npm run build 2>&1';
const SANDBOX_TEST_CMD = process.env.SANDBOX_TEST_CMD || 'npm test -- --passWithNoTests 2>&1';

/**
 * Runs build + tests inside an ephemeral Docker container mounted at the workspace path.
 * Returns a structured result so callers can feed stderr back to the GLM generator.
 *
 * Set SANDBOX_ENABLED=false to skip. Docker must be available on the host.
 */
export class SandboxTestRunner {
    async run(workspacePath: string, runId: string): Promise<SandboxTestResult> {
        if (process.env.SANDBOX_ENABLED === 'false') {
            return {
                passed: true,
                exitCode: 0,
                stdout: '',
                stderr: '',
                combinedOutput: '',
                skipped: true,
                skipReason: 'SANDBOX_ENABLED=false',
            };
        }

        const containerName = `devcore-sandbox-${runId.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}-${Date.now()}`;
        const shellCmd = `${SANDBOX_BUILD_CMD} && ${SANDBOX_TEST_CMD}`;

        const args = [
            'run',
            '--rm',
            '--name', containerName,
            '--network', 'none',
            '-v', `${workspacePath}:/workspace:ro`,
            '-w', '/workspace',
            '--memory', '512m',
            '--cpus', '1',
            SANDBOX_IMAGE,
            'sh', '-c', shellCmd,
        ];

        console.log(`[SandboxRunner] runId=${runId} starting container=${containerName}`);

        try {
            const result = await execFileAsync('docker', args, {
                timeout: SANDBOX_TIMEOUT_MS,
                maxBuffer: 5 * 1024 * 1024,
            });

            const stdout = (result.stdout || '').trim();
            const stderr = (result.stderr || '').trim();
            const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');

            console.log(`[SandboxRunner] runId=${runId} PASSED exitCode=0`);
            return { passed: true, exitCode: 0, stdout, stderr, combinedOutput, skipped: false };
        } catch (err: any) {
            // execFile throws when exit code != 0 or on timeout
            if (err?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || err?.killed) {
                console.warn(`[SandboxRunner] runId=${runId} timed out or output exceeded buffer`);
                return {
                    passed: false,
                    exitCode: -1,
                    stdout: '',
                    stderr: 'Sandbox timed out or produced too much output.',
                    combinedOutput: 'Sandbox timed out or produced too much output.',
                    skipped: false,
                };
            }

            // Docker not installed or daemon not running — skip gracefully rather than
            // treating it as a build failure and discarding valid generated code.
            const errStderr = (err?.stderr || '').toString();
            const errMsg = (err?.message || '').toString();
            const isDockerUnavailable =
                err?.code === 'ENOENT' ||
                errMsg.includes('docker: not found') ||
                errStderr.includes('failed to connect to the docker API') ||
                errStderr.includes('Cannot connect to the Docker daemon') ||
                errStderr.includes('Is the docker daemon running') ||
                errStderr.includes('.colima') ||
                errStderr.includes('.docker/run/docker.sock') ||
                errStderr.includes('connect: no such file or directory');
            if (isDockerUnavailable) {
                console.warn(`[SandboxRunner] Docker daemon unavailable, skipping sandbox test for runId=${runId}`);
                return {
                    passed: true,
                    exitCode: 0,
                    stdout: '',
                    stderr: '',
                    combinedOutput: '',
                    skipped: true,
                    skipReason: 'Docker daemon not running',
                };
            }

            const stdout = (err?.stdout || '').trim();
            const stderr = (err?.stderr || '').trim();
            const exitCode = typeof err?.code === 'number' ? err.code : 1;
            const combinedOutput = [stdout, stderr].filter(Boolean).join('\n').slice(0, 4000);

            console.warn(`[SandboxRunner] runId=${runId} FAILED exitCode=${exitCode} stderr=${stderr.slice(0, 300)}`);
            return { passed: false, exitCode, stdout, stderr, combinedOutput, skipped: false };
        }
    }
}
