# Hackathon Scope Architecture

## Objective
Deliver one production-like flow that judges can follow end-to-end in 4 minutes without fragile handoffs.

## Scope In
- Telegram interface only.
- NextJS + NodeJS request path.
- Two paired domains: frontend and backend.
- Approval gate before execution.
- GitHub PR output with docs/changelog.
- Founder loop with landing + Stripe notification.

## Scope Out (Post-Hackathon)
- WhatsApp/Slack adapters.
- Additional domain agents (Python ML, infra, mobile).
- Advanced memory ranking and long-horizon planning.
- Full enterprise RBAC and policy management.

## Day-by-Day Build Mapping

1. Day 1-2
- `apps/telegram-bot`
- `services/openclaw-gateway`
- `services/orchestrator` (issue + approval state)

2. Day 3-4
- `services/architecture-planner`
- `services/agent-runner`
- `packages/llm-router`

3. Day 5-6
- `services/integration-verifier`
- `services/report-generator`
- `apps/dashboard`

4. Day 6-7
- `apps/landing-page`
- `apps/dashboard` (DevClaw monitor)
- Demo polish + README

## Demo-Critical Reliability Controls

1. Pre-cache a known bugfix path for the reviewer rewrite loop.
2. Add deterministic fallback response if model timeout > 15s.
3. Keep one golden recorded run ID for dashboard replay mode.
4. Lock provider/model versions in config to avoid last-minute drift.
