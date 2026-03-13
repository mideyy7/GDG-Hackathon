import axios from 'axios';

export interface OpenClawExecutePayload {
    runId: string;
    [key: string]: unknown;
}

export interface OpenClawExecuteDispatchResult {
    runRef: string;
    engine: string;
    accepted: boolean;
    [key: string]: unknown;
}

export interface OpenClawExecutionDispatcher {
    dispatch(payload: OpenClawExecutePayload): Promise<OpenClawExecuteDispatchResult>;
}

class AgentRunnerExecutionDispatcher implements OpenClawExecutionDispatcher {
    private readonly baseUrl = process.env.OPENCLAW_AGENT_RUNNER_URL || 'http://localhost:3030';
    private readonly executePath = process.env.OPENCLAW_AGENT_RUNNER_EXECUTE_PATH || '/api/execute';
    private readonly timeoutMs = (() => {
        const parsed = Number.parseInt(process.env.OPENCLAW_EXECUTION_DISPATCH_TIMEOUT_MS || '', 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
        return 4 * 60 * 60 * 1000;
    })();

    async dispatch(payload: OpenClawExecutePayload): Promise<OpenClawExecuteDispatchResult> {
        const response = await axios.post(`${this.baseUrl}${this.executePath}`, {
            ...payload,
            source: 'openclaw-engine',
        }, {
            timeout: this.timeoutMs,
        });
        const runRef = typeof response.data?.runRef === 'string'
            ? response.data.runRef
            : payload.runId;
        const engine = typeof response.data?.engine === 'string'
            ? response.data.engine
            : 'agent-runner';

        return {
            ...(response.data || {}),
            runRef,
            engine,
            accepted: true,
        };
    }
}

export const getExecutionDispatcher = (): OpenClawExecutionDispatcher =>
    new AgentRunnerExecutionDispatcher();
