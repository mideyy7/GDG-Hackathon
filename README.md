# DevCore

> Turn a plain-English software request into a reviewed GitHub pull request.

DevCore is an agentic software delivery system for small product teams, founders, and developers who want to go from request -> plan -> approval -> code -> pull request with less manual coordination.

Instead of stopping at code suggestions inside an IDE, DevCore runs a full workflow:

1. A user submits a task in natural language
2. DevCore creates an architecture plan with affected files and risks
3. The user approves, rejects, or refines the plan
4. Generator and reviewer agents iterate on the implementation
5. The change can be validated with automated checks, including a security review stage
6. A GitHub branch and PR are produced for human review

## Why This Project Exists

Software teams still waste time on simple but necessary work:

- small bug fixes that require opening the repo, finding the file, editing, testing, pushing, and opening a PR
- product or founder requests that are clear in English but expensive to convert into engineering work
- repetitive implementation cycles that still need planning, review, and traceability

Most "vibe coding" tools help one person generate code. DevCore is designed to help a team move work through an actual delivery workflow.

## What Makes DevCore Different

DevCore is not a prompt wrapper and not baseline RAG.

The product is differentiated by workflow automation, approval gates, and multi-stage execution:

- structured planning before any code is written
- separate generator and reviewer agents instead of one-shot code generation
- test and security gates before delivery
- GitHub-native output as a branch and pull request
- conversational refinement of plans and follow-up amendments

The goal is not just to generate code. The goal is to reduce the operational friction between an idea and a mergeable change.


### Innovation

DevCore treats software delivery as a multi-step system, not a single LLM response.

Key innovations in the current prototype:

- plan-first execution with explicit user approval
- paired generator/reviewer agent loop with rewrite feedback
- repo-aware planning with semantic file retrieval
- security review as a formal gate before code is delivered
- GitHub issue -> branch -> PR workflow from chat-based task intake

### Technical Execution and User Experience


## What it does

- **Submit**: Describe a code change via the web dashboard, WhatsApp, or Telegram — DevCore analyses your full repo and returns a structured architecture plan.
- **Review & Approve**: Inspect the plan (files affected, agent assignments, risk flags) and approve, refine, or reject it — from the web UI or with a single chat command.
- **Generate**: GLM-4.7-Flash writes the code; a second independent GLM-4.7-Flash instance reviews it, requesting rewrites until approved (up to 3 iterations).
- **Test**: Changes run through `npm build + npm test` inside an ephemeral, network-isolated Docker sandbox — stderr is fed back to the generator if tests fail.
- **Secure**: A dedicated GLM-4.7 security reviewer scans every diff for OWASP Top 10 vulnerabilities before anything is pushed.
- **Deliver**: Branch is pushed to GitHub, PR is opened, and the link is surfaced in your dashboard or sent via chat — in under 3 minutes

DevCore has a web-based interface and can also be integrated into Whatsapp/Telegram.

### Impact

DevCore improves user workflow by reducing the number of manual steps needed to ship small-to-medium engineering tasks.

For a founder, PM, or engineer, the value is:

- less context switching
- faster turnaround on repetitive tasks
- visible review and risk controls
- cleaner handoff into GitHub
- fewer "can you quickly change this?" interruptions

## Current End-to-End Flow

```text
User (Web Dashboard / Telegram / WhatsApp)
  -> submit task
Gateway
  -> authenticate user and route request
Orchestrator
  -> create issue, fetch context, request plan
OpenClaw Engine
  -> generate architecture plan, retrieve relevant repo context
User
  -> approve / reject / refine
Agent Runner
  -> generate code, review code, run optional validation/security stages
GitHub
  -> push branch and open pull request
User
  -> receive status and PR link
```

## Core Features
### 1. Plan Before Code

Every task is turned into a structured architecture plan before execution. This creates a clear approval point and reduces reckless one-shot generation.

### 2. Generator -> Reviewer Loop

Code generation and code review are handled by separate agent roles. Reviewer feedback can trigger rewrite iterations before the change progresses.

### 3. Security Gate

Before delivery, the change can be reviewed for concrete OWASP-style issues such as injection risks, hardcoded secrets, auth failures, and misconfiguration.

### 4. Test-Aware Execution

The execution flow is structured to support automated validation loops before a PR is opened.

### 5. Conversational Refinement

Users can refine a plan before approval and amend an existing branch after initial delivery.

### 6. Repository-Aware Planning

The planner can use semantic retrieval to identify relevant files and improve planning quality on larger repositories.


## Architecture

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + Tailwind CSS |
| Messaging | Telegram Bot API, WhatsApp Web.js |
| Persistence | Supabase PostgreSQL |
| Retrieval | pgvector-based semantic search |
| Version Control | GitHub API |
| AI Routing | Custom router in `packages/llm-router` |

## Model Usage

AI models are used as infrastructure inside a larger workflow, not as the product itself.

In the current implementation:

- planning, orchestration, and security review are routed through OpenRouter-backed model calls
- generation and review are routed through the internal LLM router
- semantic search uses embedding-based retrieval for repo context


## Repository Structure

```text
apps/
  dashboard/
  landing-page/
  telegram-bot/
  whatsapp-bot/

services/
  openclaw-gateway/
  orchestrator/
  openclaw-engine/
  agent-runner/

packages/
  contracts/
  llm-router/

docs/
  architecture/
  runbooks/

infra/
  docker/
```

## Getting Started

### Prerequisites


- Node.js 20+, npm 10+
- **Z.AI API key** — [open.bigmodel.cn](https://open.bigmodel.cn) — required for GLM generation
- **OpenRouter API key** — for `glm-4.7` planning + security reviewer
- GitHub personal access token (repo + issues scope)
- Telegram bot token (from @BotFather) and/or WhatsApp session
- Supabase project (PostgreSQL + pgvector extension)
- Docker (optional — only needed for sandbox test execution; file scanning works without it)
- 

### 1. Clone & Install

```bash
npm install
```

=======
### Recommended Local Run

Run the backend services:

```bash
npx turbo run dev \
  --filter=openclaw-gateway \
  --filter=orchestrator \
  --filter=openclaw-engine \
  --filter=agent-runner \
  --concurrency=10
```


Key variables (set in each relevant service `.env`):

| Variable | Description |
|---|---|
| `ZAI_API_KEY` | Z.AI direct API key — core GLM inference |
| `OPENROUTER_API_KEY` | OpenRouter key — planner, orchestrator, security reviewer |
| `GITHUB_TOKEN` | Personal access token with `repo` + `issues` scope |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | From @BotFather (only needed for Telegram bot) |
| `SECURITY_SCAN_ENABLED` | `true` / `false` — disable to skip OWASP gate |
| `SANDBOX_ENABLED` | `true` / `false` — disable if Docker is unavailable |
| `RAG_ENABLED` | `true` / `false` — disable to skip semantic repo search |

### 3. Set up Supabase schema

Run once in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS task_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  user_id      text, repo text, description text,
  status       text NOT NULL DEFAULT 'pending',
  plan_id      text, plan_details jsonb, pr_url text,
  pr_number    integer, branch_name text, issue_number integer,
  issue_url    text, chat_id text, channel text, request_id text
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id      text PRIMARY KEY,
  github_token text, repo text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  run_id      text, request_id text, role text NOT NULL,
  provider    text NOT NULL, model text NOT NULL,
  tokens_used integer, cost_usd numeric(12, 8), latency_ms integer
);

-- RAG (set RAG_ENABLED=false to skip)
CREATE TABLE IF NOT EXISTS file_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  repo       text NOT NULL, file_path text NOT NULL,
  content    text NOT NULL, embedding vector(1536),
  UNIQUE (repo, file_path)
);

CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx
  ON file_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_file_embeddings(
  query_embedding vector(1536), match_repo text, match_count int DEFAULT 10
)
RETURNS TABLE(file_path text, content text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT file_path, content,
         1 - (embedding <=> query_embedding) AS similarity
  FROM file_embeddings
  WHERE repo = match_repo
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 4. Run

```bash
# All services + dashboard + landing page
npm run dev

# Backend services + bots only (no frontend)
npm run dev:servers
```

Expected output:
```
[openclaw-gateway]  Listening on http://localhost:3001
[orchestrator]      Listening on http://localhost:3010
[agent-runner]      Listening on http://localhost:3030
[openclaw-engine]   Listening on http://localhost:3040
[dashboard]         Ready on http://localhost:3005
```

Open **http://localhost:3005** to use the web dashboard.


## How It Works

1. User submits a task via the **web dashboard** (`/new-task`), WhatsApp, or Telegram.
2. Gateway authenticates the request and creates a GitHub issue.
3. Orchestrator manages the lifecycle: `intake → plan → approve → execute`.
4. OpenClaw Engine indexes the repo (RAG) and calls GLM-4.7 to produce a structured JSON plan.
5. Plan is surfaced in the dashboard (files affected, agent assignments, risk flags) and/or sent via chat. User approves, refines, or rejects.
6. Agent Runner spawns per-file sub-tasks: Generator → Reviewer loop (up to 3x rewrites).
7. Docker sandbox runs `npm build + npm test`; stderr is fed back to Generator if tests fail.
8. Security Reviewer (GLM-4.7) scans the full diff for OWASP Top 10. Critical findings block the push.
9. Branch is pushed, PR is opened — link appears in the dashboard run detail view and/or is sent via chat.


## System Architecture

```
User (Web Dashboard / WhatsApp / Telegram)
  |  Submit task: "Add dark mode to the settings page"
  v
OpenClaw Gateway (port 3001)
  |  authenticate, route, create GitHub issue
  v
Orchestrator (port 3010)
  |  lifecycle management: intake -> plan -> approve -> execute
  v
OpenClaw Engine (port 3040)  ----------- glm-4.7 (Architecture Planner)
  |  full-repo RAG index (embedding-3 + pgvector)
  |  structured JSON plan: files, domains, risk flags
  v
User approves plan (dashboard or /approve chat command)
  v
Agent Runner (port 3030) -- per sub-task:
  |
  +-- Code Generator    (glm-4.7-flash)  ->  complete file rewrite
  +-- Code Reviewer     (glm-4.7-flash)  ->  APPROVED | REWRITE
  |         if REWRITE ----------------------> Generator (up to 3x)
  +-- Sandbox Test Runner (Docker)       ->  npm build + npm test
  |         if FAIL    ----------------------> Generator with stderr
  +-- Security Reviewer (glm-4.7)       ->  OWASP Top 10 scan
            if BLOCKED ------------------------> notify user, halt
  v
GitHub Client -> push branch -> open pull request
  v
User receives PR link in dashboard + chat notification
```


## Z.AI Integration — The Full GLM Ecosystem

Every agent runs a Z.AI GLM model, matched to the cognitive complexity of its role:

| Agent | Model | Route | Role |
|---|---|---|---|
| Architecture Planner | `glm-4.7` | OpenRouter | 203k-context full-repo analysis, structured JSON plan |
| Workflow Orchestrator | `glm-4.7` | OpenRouter | Multi-step state reasoning across the task lifecycle |
| Code Generator | `glm-4.7-flash` | Direct Z.AI API | Two-phase CoT streaming → complete file rewrites |
| Code Reviewer | `glm-4.7-flash` | Direct Z.AI API | Independent quality scoring with REWRITE feedback |
| Frontend Generator | `glm-4.7-flash` | Direct Z.AI API | Specialised React/CSS/UI code generation |
| Backend Generator | `glm-4.7-flash` | Direct Z.AI API | Specialised API/DB/service code generation |
| Security Reviewer | `glm-4.7` | OpenRouter | OWASP Top 10 vulnerability scanning on every diff |


Run the dashboard:

```bash
npx turbo run dev --filter=@devclaw/dashboard
```

Run the landing page separately if needed:

```bash
npx turbo run dev --filter=@devclaw/landing-page
```

Or run the workspace defaults:

```bash
npm run dev
```

### Default Local Ports

- Gateway: `http://localhost:3001`
- Orchestrator: `http://localhost:3010`
- Agent Runner: `http://localhost:3030`
- OpenClaw Engine: `http://localhost:3040`
- Dashboard: `http://localhost:3005`

## Environment Setup

Each service expects its own `.env` file. Review the service code before running and provide the required values for:

- Supabase URL and service role key
- GitHub OAuth credentials and/or GitHub token
- model provider API keys
- bot tokens where applicable
- service-to-service URLs

At minimum, expect to configure values in:

- `services/openclaw-gateway/.env`
- `services/orchestrator/.env`
- `services/openclaw-engine/.env`
- `services/agent-runner/.env`
- `apps/dashboard/.env` if you introduce dashboard-specific config later
- `apps/telegram-bot/.env`
- `apps/whatsapp-bot/.env`

## Interfaces

### Web Dashboard — http://localhost:3005

The dashboard provides the full experience with richer visibility than the chat bots:

| Page | What you can do |
|---|---|
| `/` | Mission control — stats, active runs, quick actions |
| `/repositories` | Browse and link a GitHub repo via OAuth |
| `/new-task` | Submit a task with a free-text description (up to 2000 chars) |
| `/runs` | List all runs, filter by status (pending, generating, completed, failed) |
| `/runs/:runId` | Full plan inspection (files, agents, risk flags), approve/refine/reject, live agent terminal, PR link |

### Chat Commands (WhatsApp / Telegram)

### Shared Commands

- `/login` - link GitHub account
- `/repo owner/repo` - set active repository
- `/task <description>` - create a new software task
- `/approve <planId>` - approve a generated plan
- `/refine <planId> <notes>` - request changes to the plan
- `/reject <planId>` - cancel the plan
- `/amend <planId> <instructions>` - update an existing branch after delivery
- `/status` - show connection/repo state
- `/repos` - list available repositories

## Web Dashboard

The dashboard in `apps/dashboard` currently supports:

- GitHub sign-in from the browser
- repository discovery and linking
- task submission from the web UI
- run listing and run detail pages
- plan approve / reject / refine actions
- live event streaming with the Agent Terminal
- PR and branch result views

In development, the dashboard proxies:

- `/api/*` to the gateway on port `3001`
- `/orchestrator/*` to the orchestrator on port `3010`



## Summary

### Problem

Small engineering tasks still require a full coordination cycle even when the change itself is simple.

### Solution

DevCore turns a natural-language request into a traceable software delivery workflow with planning, approval, execution, review, and PR output.

### Why It Matters

This improves delivery speed while preserving controls that generic coding copilots usually skip.

### Why It Is Not A Generic Chatbot
- it creates structured plans
- it uses approval gates
- it coordinates multiple execution stages
- it integrates with GitHub delivery flow
- it performs review and security checks before output


## Repository Structure

```
apps/
  dashboard/        Web UI: task submission, plan approval, live agent terminal, run history
  landing-page/     Marketing site (React + Vite + Tailwind)
  telegram-bot/     Telegram intake + proactive push notifications
  whatsapp-bot/     WhatsApp intake + proactive push notifications

services/
  openclaw-gateway/ Central ingress: message routing, GitHub OAuth, health
  orchestrator/     Task lifecycle: intake, planning, approval, execution, amendment
  openclaw-engine/  Architecture planning: GLM planner + RAG indexer/searcher
  agent-runner/     Generator/Reviewer loop + sandbox tests + security gate + GitHub push

packages/
  llm-router/       Z.AI provider routing: streaming SSE, retries, fallback, usage logging
  contracts/        Shared TypeScript interfaces (@coredev/contracts)
  github-client/    Octokit wrapper: issues, branches, PRs, file tree

infra/
  docker/           docker-compose.yml for local full-stack development

docs/
  architecture/     System design, API contracts, scope decisions
  runbooks/         Demo checklist, debugging guide
```



