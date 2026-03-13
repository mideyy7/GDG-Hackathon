# Orchestrator Service

## Purpose
The Orchestrator Service is the central workflow coordinator for DevClaw. It handles:
1. **Intake & Triage**: Receiving task requests (from `openclaw-gateway`), validating them, and creating corresponding GitHub issues.
2. **Architecture Planning**: Dispatching accepted tasks to the architecture planning engine (currently `openclaw-engine`) to generate a technical blueprint.
3. **Approval Gating**: Pausing the workflow to await user approval/rejection via chat (Telegram/WhatsApp).
4. **Execution Dispatch**: Forwarding approved plans to the execution engine to generate and commit the actual code.

## Engine Configuration
The orchestrator routes requests to specific engines based on configuration:
- `ORCHESTRATION_ENGINE=legacy|openclaw` (global default)
- `EXECUTION_ENGINE=legacy|openclaw` (optional override)

**Note:** The legacy `architecture-planner` has been removed. All architecture planning requests are now exclusively routed to the `openclaw-engine`.

* Legacy Execution Engine: `AGENT_RUNNER_URL` (default `http://localhost:3030`)
* OpenClaw Engine (Planning & Execution): `OPENCLAW_ENGINE_URL` (default `http://localhost:3040`)

## Timeout Configuration
The orchestrator now uses explicit timeouts across GitHub, planning, execution dispatch, and bot notifications.

- `ORCHESTRATOR_GITHUB_SEARCH_TIMEOUT_MS` (default `20000`)
- `ORCHESTRATOR_GITHUB_CREATE_TIMEOUT_MS` (default `30000`)
- `ORCHESTRATOR_PLAN_TIMEOUT_MS` (default `1200000`)
- `ORCHESTRATOR_REFINE_TIMEOUT_MS` (default `1200000`)
- `ORCHESTRATOR_EXECUTE_TIMEOUT_MS` (default `14400000`)
- `ORCHESTRATOR_GIT_TIMEOUT_MS` (default `900000`)
- `ORCHESTRATOR_BOT_SEND_TIMEOUT_MS` (default `20000`)

When a plan is approved, orchestrator sends a proactive bot message that execution has started.
