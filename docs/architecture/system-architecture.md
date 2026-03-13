# System Architecture

This architecture is optimized for the hackathon requirement: one reliable end-to-end path from chat request to merged-quality PR.

## Layered View

1. Interface Layer
- `apps/telegram-bot`
- `services/openclaw-gateway`

2. Triage and Planning Layer
- `services/orchestrator`
- `services/architecture-planner`

3. Execution Layer
- `services/agent-runner`
- `services/integration-verifier`
- `services/report-generator`

4. Shared Platform Layer
- `packages/contracts`
- `packages/llm-router`
- `packages/memory`
- `packages/github-client`
- `packages/observability`

## Component Graph

```mermaid
flowchart LR
  U[User in Telegram] --> TB[apps/telegram-bot]
  TB --> GW[services/openclaw-gateway]
  GW --> ORCH[services/orchestrator]

  ORCH --> GH[packages/github-client]
  ORCH --> PLAN[services/architecture-planner]
  PLAN --> LLMR[packages/llm-router]

  ORCH --> ARUN[services/agent-runner]
  ARUN --> GEN[Generator Agent]
  ARUN --> REV[Reviewer Agent]
  GEN --> REV
  REV --> ARUN

  ORCH --> IV[services/integration-verifier]
  IV --> ORCH
  ORCH --> REP[services/report-generator]
  REP --> GH
  REP --> TB

  ORCH --> MEM[packages/memory]
  ORCH --> OBS[packages/observability]
  ARUN --> OBS
  PLAN --> OBS

  ORCH --> DASH[apps/dashboard]
```

## Core Request Lifecycle (Must Ship)

```mermaid
sequenceDiagram
  participant User as Telegram User
  participant Bot as telegram-bot
  participant Gateway as openclaw-gateway
  participant Orch as orchestrator
  participant Planner as architecture-planner
  participant Runner as agent-runner
  participant Verifier as integration-verifier
  participant Reporter as report-generator
  participant GH as GitHub

  User->>Bot: "Login button broken on mobile Safari"
  Bot->>Gateway: normalized request
  Gateway->>Orch: session + request payload
  Orch->>GH: create/dedupe issue
  Orch->>Planner: generate architecture plan
  Planner-->>Orch: affected files + risks + assignments
  Orch-->>Bot: approval card (Approve / Reject)

  User->>Bot: Approve
  Bot->>Orch: approved plan id
  Orch->>Runner: execute paired agents
  Runner-->>Orch: approved patch set
  Orch->>Verifier: run integration checks
  Verifier-->>Orch: pass/fail + diagnostics
  Orch->>Reporter: build PR summary and walkthrough
  Reporter->>GH: open PR + changelog updates
  Reporter-->>Bot: completion narrative + PR link
```

## Service Ownership and Boundaries

- `openclaw-gateway`
  - Owns message ingress, channel adapters, user/session correlation.
  - Must not contain business orchestration logic.

- `orchestrator`
  - Owns workflow state machine and approval gate enforcement.
  - Must not call model providers directly; always uses `packages/llm-router` or downstream services.

- `architecture-planner`
  - Produces deterministic plan objects and risk flags.
  - Inputs: issue context + repo metadata. Outputs typed plan contract.

- `agent-runner`
  - Manages generator/reviewer loop and retry policy.
  - No direct GitHub writes.

- `integration-verifier`
  - Executes test suites and static checks in isolated worker context.

- `report-generator`
  - Creates PR description, changelog entries, and user-facing summary.

## Runtime Rules

1. No code is written before explicit approval event is persisted.
2. All inter-service messages use `packages/contracts` schemas.
3. All model calls pass through `packages/llm-router` for provider policy + redaction.
4. All agent actions emit traces through `packages/observability`.
5. Secrets are runtime-injected and never persisted in conversation memory.

## Initial Deployment Topology

- Local hackathon: Docker Compose under `infra/docker`.
- Process split:
  - One web process for `apps/dashboard` and `apps/landing-page`.
  - One bot process for `apps/telegram-bot`.
  - One worker process per service in `services/*`.
- Shared Redis for memory and job queue.
- Postgres (or SQLite fallback for demo) for durable run records.
