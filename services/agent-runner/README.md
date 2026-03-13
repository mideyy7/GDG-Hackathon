# agent-runner

## Purpose
Dispatches approved plans to an execution backend and runs paired generator/reviewer loops per execution subtask.

## Endpoints
- `GET /health`
- `POST /api/execute`

## Agent Pairing
- `FrontendAgentFactory` builds `FrontendGenerator` + `FrontendReviewer`.
- `BackendAgentFactory` builds `BackendGenerator` + `BackendReviewer`.
- Agent loop retries are controlled via `RUNNER_AGENT_LOOP_MAX_ITERATIONS` (default: `3`).
- Set `RUNNER_AGENT_LOOP_ENABLED=false` to disable loop execution.

### LLM Routing
- Frontend/Backend `Generator` roles route to FLock DeepSeek V3.2.
- Frontend/Backend `Reviewer` roles route to Z.AI GLM.
- Provider-level retry/fallback behavior is controlled by `packages/llm-router`.

## Backend Selection
- `RUNNER_ENGINE=stub` (default): deterministic local dispatch.
- `RUNNER_ENGINE=openclaw`: forwards execution to OpenClaw.
- `RUNNER_ENGINE=docker`: runs execution inside an ephemeral local Docker sandbox.

### OpenClaw Config
- `OPENCLAW_RUNNER_URL` (default: `http://localhost:3040`)
- `OPENCLAW_RUNNER_EXECUTE_PATH` (default: `/api/execute`)
- `RUNNER_OPENCLAW_EXECUTE_TIMEOUT_MS` (default: `14400000`)
- `ORCHESTRATOR_CALLBACK_URL` (optional)

### Docker Sandbox Config
- `RUNNER_DOCKER_IMAGE` (default: `node:22-bookworm-slim`)
- `RUNNER_DOCKER_COMMAND` (default: `echo "DevClaw sandbox execution completed."`)
- `RUNNER_DOCKER_TIMEOUT_MS` (default: `1200000`)
- `RUNNER_DOCKER_NETWORK` (default: `none`)
- `RUNNER_DOCKER_CPUS` (default: `2`)
- `RUNNER_DOCKER_MEMORY` (default: `4g`)
- `RUNNER_DOCKER_PIDS_LIMIT` (default: `512`)

For Docker mode, orchestrator must provide `isolatedEnvironmentPath` so agent-runner can mount the cloned workspace to `/workspace` in the sandbox container.
