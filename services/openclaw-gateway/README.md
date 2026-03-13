# openclaw-gateway

## Purpose
TBD implementation for the authoritative boundary defined in /Users/agmad/Documents/DevClaw/docs/architecture/system-architecture.md.

## Setup & Usage

For instructions on how to use Docker and Cloudflare Tunnels for local development and webhook testing, see [DOCKER_TUNNEL_SETUP.md](./DOCKER_TUNNEL_SETUP.md).

## Initial Tasks
1. Define public interface and contracts.
2. Add minimal health check and logging.
3. Add unit tests for core behavior.

## Timeout Configuration
Gateway now applies explicit timeout controls for outbound calls:

- `GATEWAY_GITHUB_OAUTH_TIMEOUT_MS` (default `30000`)
- `GATEWAY_BOT_SEND_TIMEOUT_MS` (default `15000`)
- `GATEWAY_GITHUB_REPOS_TIMEOUT_MS` (default `30000`)
- `GATEWAY_ORCHESTRATOR_TASK_TIMEOUT_MS` (default `1200000`)
- `GATEWAY_ORCHESTRATOR_APPROVE_TIMEOUT_MS` (default `14400000`)
- `GATEWAY_ORCHESTRATOR_REJECT_TIMEOUT_MS` (default `30000`)
- `GATEWAY_ORCHESTRATOR_REFINE_TIMEOUT_MS` (default `1200000`)
