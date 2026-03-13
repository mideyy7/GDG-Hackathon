import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { getExecutionPlugin } from './executionPlugin';
import { ExecutionCoordinator } from './executionCoordinator';
import { SecurityVulnerabilityError } from './securityReviewer';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3030;
const executionPlugin = getExecutionPlugin();
const executionCoordinator = new ExecutionCoordinator(executionPlugin);

const toCompactJson = (value: unknown, fallback = 'n/a'): string => {
    if (value === undefined) return fallback;
    if (value === null) return 'null';
    if (typeof value === 'string') {
        return value.length > 500 ? `${value.slice(0, 500)}...(truncated)` : value;
    }
    try {
        const json = JSON.stringify(value);
        return json.length > 500 ? `${json.slice(0, 500)}...(truncated)` : json;
    } catch {
        return fallback;
    }
};

const formatExecutionError = (err: any): string => {
    if (!err) return 'unknown error';

    const details: string[] = [];
    const message = typeof err.message === 'string' ? err.message : String(err);
    details.push(`message=${message}`);

    if (typeof err.name === 'string') details.push(`name=${err.name}`);
    if (typeof err.role === 'string') details.push(`role=${err.role}`);
    if (typeof err.provider === 'string') details.push(`provider=${err.provider}`);
    if (typeof err.model === 'string') details.push(`model=${err.model}`);
    if (typeof err.requestId === 'string') details.push(`requestId=${err.requestId}`);
    if (typeof err.statusCode === 'number') details.push(`statusCode=${err.statusCode}`);
    if (err.responseBody !== undefined) details.push(`responseBody=${toCompactJson(err.responseBody)}`);

    if (err.response?.status) details.push(`httpStatus=${err.response.status}`);
    if (err.config?.url) details.push(`url=${err.config.url}`);
    if (err.response?.data !== undefined) details.push(`httpData=${toCompactJson(err.response.data)}`);

    return details.join(' | ');
};

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'agent-runner' });
});

app.post('/api/execute', async (req: Request, res: Response): Promise<any> => {
    const payload = req.body || {};
    const { runId } = payload;

    if (!runId) {
        return res.status(400).json({ error: 'Missing required field: runId' });
    }

    try {
        console.log(
            `[AgentRunner] Starting execution runId=${runId} ` +
            `subTasks=${Array.isArray(payload.executionSubTasks) ? payload.executionSubTasks.length : 0} ` +
            `workspace=${payload.isolatedEnvironmentPath || 'n/a'}`
        );
        const dispatch = await executionCoordinator.execute(payload);
        console.log(
            `[AgentRunner] Execution completed runId=${runId} engine=${dispatch.engine} ` +
            `patchSetRef=${dispatch.approvedPatchSet?.patchSetRef || 'n/a'}`
        );
        return res.status(202).json({
            success: true,
            status: 'dispatched',
            runRef: dispatch.runRef,
            engine: dispatch.engine,
            ...(dispatch.agentLoopReport
                ? {
                    agentLoop: {
                        maxIterations: dispatch.agentLoopReport.maxIterations,
                        totalSubTasks: dispatch.agentLoopReport.totalSubTasks,
                        approvedSubTasks: dispatch.agentLoopReport.approvedSubTasks,
                        rewriteRequiredSubTasks: dispatch.agentLoopReport.rewriteRequiredSubTasks,
                    },
                }
                : {}),
            ...(dispatch.approvedPatchSet
                ? {
                    approvedPatchSet: dispatch.approvedPatchSet,
                }
                : {}),
            ...(dispatch.branchPush
                ? {
                    branchPush: dispatch.branchPush,
                }
                : {}),
        });
    } catch (err: any) {
        if (err instanceof SecurityVulnerabilityError) {
            console.warn(
                `[AgentRunner][SecurityGate] BLOCKED runId=${runId} — ` +
                `${err.result.vulnerabilities.length} vuln(s): ${err.result.summary}`
            );
            return res.status(422).json({
                error: 'security_blocked',
                summary: err.result.summary,
                vulnerabilities: err.result.vulnerabilities,
                model: err.result.model,
                provider: err.result.provider,
                runId: err.runId,
            });
        }
        console.error(`[AgentRunner] Failed to dispatch execution for runId=${runId}: ${formatExecutionError(err)}`);
        return res.status(502).json({ error: 'Failed to dispatch execution run' });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`[AgentRunner] Service listening on port ${port}`);
    });
}

export default app;
