# DevClaw

> **Send a WhatsApp message. Get a GitHub pull request.**
> No IDE. No manual steps. No waiting.

DevClaw is a **production-ready multi-agent AI system** that turns a plain-English task description into reviewed, security-scanned, committed code on a GitHub branch — delivered back to you via WhatsApp or Telegram.

Built entirely on the **Z.AI GLM model ecosystem**, with each model matched to the cognitive complexity of its role.

---

## Demo

> Watch the 5-minute walkthrough: [Link to pitch video]

**Live flow:**
1. User sends `/task Change homepage button text from "Start the journey" to "Start journey"` via WhatsApp
2. DevClaw plans the change, sends back an architecture plan for approval
3. User approves with `/approve plan-abc123`
4. GLM-4.7-Flash generates the code change; a second GLM-4.7-Flash instance reviews it
5. GLM-4.7 scans the diff for OWASP vulnerabilities
6. Branch is pushed to GitHub, user receives a link via WhatsApp — in under 3 minutes

---

## The Problem

The interface between human intent and working code is still entirely manual.

- A product manager wants to change a button label. A developer has to context-switch, open the repo, find the file, make the edit, push a branch, open a PR. Twenty minutes for a two-word change.
- A startup founder can describe exactly what they want built but can't implement it, and hiring a developer for every small task is unviable.
- Engineering teams burn 30–40% of sprint capacity on small-to-medium tasks that are repetitive but still require the full write → review → push cycle.

AI coding assistants like Copilot help, but they still require a developer in the loop. DevClaw removes the loop entirely.

---

## Z.AI Integration — The Full GLM Ecosystem

Every agent runs a Z.AI GLM model. Models are matched to the cognitive complexity of their role:

| Agent | Model | Route | Role |
|---|---|---|---|
| Architecture Planner | `glm-4.7` | OpenRouter | 203k-context full-repo analysis, structured JSON plan |
| Workflow Orchestrator | `glm-4.7` | OpenRouter | Multi-step state reasoning across the task lifecycle |
| Code Generator | `glm-4.7-flash` | Direct Z.AI API | Two-phase CoT streaming → complete file rewrites |
| Code Reviewer | `glm-4.7-flash` | Direct Z.AI API | Independent quality scoring with REWRITE feedback |
| Frontend Generator | `glm-4.7-flash` | Direct Z.AI API | Specialised React/CSS/UI code generation |
| Backend Generator | `glm-4.7-flash` | Direct Z.AI API | Specialised API/DB/service code generation |
| Security Reviewer | `glm-4.7` | OpenRouter | OWASP Top 10 vulnerability scanning on every diff |

**Fallback strategy:** every OpenRouter call falls back to `glm-4.7-flash` via direct Z.AI API. DevClaw never leaves the GLM family.

This is not a single LLM call wrapped in a UI. It is a coordinated multi-agent pipeline where each GLM instance has a distinct role, receives structured input, and produces structured output that gates the next stage.

---

## System Architecture

```
User (WhatsApp / Telegram)
  |  /task Add dark mode to the settings page
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
User approves plan via WhatsApp (/approve plan-abc123)
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
User receives: "Code is ready! Branch: devclaw/plan-abc123"
```

---

## Five Production-Grade Features

### 1. Agentic Generator -> Reviewer Loop
The Generator and Reviewer are separate GLM-4.7-Flash instances. The Reviewer's notes are injected into the next Generator prompt — the model self-corrects across up to 3 iterations before giving up.

### 2. Sandbox Auto-Test Loop
After Reviewer approval, DevClaw runs `npm install && npm run build && npm test` inside an ephemeral Docker container with no network access. If tests fail, stderr is fed back to the Generator as grounding context. Set `SANDBOX_ENABLED=false` to skip when Docker is unavailable.

### 3. Security Gate (OWASP Top 10)
Before any push, a dedicated GLM-4.7 security reviewer scans the full diff for SQL injection, XSS, IDOR, hardcoded secrets, and 7 more OWASP categories. Critical/high findings block the push and send a detailed alert to the user. Set `SECURITY_SCAN_ENABLED=false` to bypass.

### 4. Conversational PR Refinement
After a branch is pushed, users send `/amend <planId> <instructions>` to push additional commits to the same branch with no new task needed. Works on both WhatsApp and Telegram.

### 5. Semantic Repository Search (RAG + pgvector)
Before planning, DevClaw embeds all repo files with Z.AI `embedding-3` and stores them in Supabase pgvector. The top-k most relevant file snippets are retrieved via cosine similarity and injected into the planner prompt — making plans dramatically more accurate on large codebases.

---

## Repository Structure

```
apps/
  landing-page/     Marketing site (React + Vite + Tailwind)
  telegram-bot/     Telegram intake + proactive push notifications
  whatsapp-bot/     WhatsApp intake + proactive push notifications

services/
  openclaw-gateway/ Central ingress: message routing, GitHub OAuth, health endpoint
  orchestrator/     Task lifecycle: intake, planning, approval, execution, amendment
  openclaw-engine/  Architecture planning: GLM planner + RAG indexer/searcher
  agent-runner/     Generator/Reviewer loop + sandbox tests + security gate + GitHub push

packages/
  llm-router/       Z.AI provider routing: streaming SSE, retries, fallback, usage logging
  contracts/        Shared TypeScript interfaces (ArchitecturePlan, IntakeRequest)
  github-client/    Octokit wrapper: issues, branches, PRs, file tree

infra/
  docker/           docker-compose.yml for local full-stack development

docs/
  architecture/     System design, API contracts, scope decisions
  runbooks/         Demo checklist, debugging guide
```

---

## LLM Router — The Z.AI Integration Layer

`packages/llm-router/` is the core of the Z.AI integration:

```typescript
import { chat, callZaiEmbedding } from '@devclaw/llm-router';

// Code generation — routes to glm-4.7-flash via direct Z.AI API
// JSON mode forced, 16k token budget for two-phase CoT + file rewrites
const reply = await chat({
  role: 'generator',
  messages: [{ role: 'user', content: 'Add a rate limiter to this Express route...' }],
  requestId: 'run-abc-123',
});

// Semantic file search embedding
const vector = await callZaiEmbedding('database connection pooling logic');
```

What it handles:

- **Provider routing** — maps each agent role to the right model and route (direct Z.AI vs OpenRouter)
- **Two-phase SSE streaming** — parses GLM's `reasoning_content` (chain-of-thought) then `content` (final answer) streaming format
- **JSON mode** — passes `response_format: { type: "json_object" }` on generator roles to enforce structured output
- **Per-role token budgets** — generators get 16,384 tokens (enough for CoT + full file rewrites)
- **Retry + fallback** — transient failures (timeout, 5xx, 429) retry on primary, then fall back to the next GLM variant
- **Usage logging** — every call is written to `llm_usage_logs` in Supabase with token count and latency for post-hoc debugging

---

## Quick Start

### Prerequisites

- Node.js 20+, npm 10+
- **Z.AI API key** — [open.bigmodel.cn](https://open.bigmodel.cn) — required for GLM generation
- **OpenRouter API key** — for `glm-4.7` planning + security reviewer
- GitHub personal access token (repo + issues scope)
- Telegram bot token (from @BotFather) and/or WhatsApp session
- Supabase project (PostgreSQL + pgvector extension)
- Docker (optional — sandbox test runner gracefully skips if unavailable)

### Install

```bash
git clone https://github.com/your-org/devclaw
cd devclaw
npm install
```

### Configure

```bash
cp services/orchestrator/.env.example     services/orchestrator/.env
cp services/agent-runner/.env.example     services/agent-runner/.env
cp services/openclaw-gateway/.env.example services/openclaw-gateway/.env
cp services/openclaw-engine/.env.example  services/openclaw-engine/.env
cp apps/telegram-bot/.env.example         apps/telegram-bot/.env
cp apps/whatsapp-bot/.env.example         apps/whatsapp-bot/.env
```

Key variables:

```env
# Z.AI -- core GLM inference engine (direct API)
ZAI_API_KEY=your_zai_api_key

# OpenRouter -- planner, orchestrator, security reviewer
OPENROUTER_API_KEY=your_openrouter_key

# GitHub
GITHUB_TOKEN=your_github_pat

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Feature flags (default: all enabled)
SECURITY_SCAN_ENABLED=true
SANDBOX_ENABLED=true
RAG_ENABLED=true
```

### Supabase Schema

Run once in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS task_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  user_id      text,
  repo         text,
  description  text,
  status       text NOT NULL DEFAULT 'pending',
  plan_id      text,
  plan_details jsonb,
  pr_url       text,
  pr_number    integer,
  branch_name  text,
  issue_number integer,
  issue_url    text,
  chat_id      text,
  channel      text,
  request_id   text
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id      text PRIMARY KEY,
  github_token text,
  repo         text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  run_id      text,
  request_id  text,
  role        text NOT NULL,
  provider    text NOT NULL,
  model       text NOT NULL,
  tokens_used integer,
  cost_usd    numeric(12, 8),
  latency_ms  integer
);

-- RAG (optional -- set RAG_ENABLED=false to skip)
CREATE TABLE IF NOT EXISTS file_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  repo       text NOT NULL,
  file_path  text NOT NULL,
  content    text NOT NULL,
  embedding  vector(1536),
  UNIQUE (repo, file_path)
);

CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx
  ON file_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_file_embeddings(
  query_embedding vector(1536),
  match_repo      text,
  match_count     int DEFAULT 10
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

### Run

```bash
# All services
npm run dev

# Core backend only (no landing page)
npm run dev:servers
```

Services start on:
- Gateway: `http://localhost:3001`
- Orchestrator: `http://localhost:3010`
- OpenClaw Engine: `http://localhost:3040`
- Agent Runner: `http://localhost:3030`

---

## Bot Commands

| Command | Description |
|---|---|
| `/login` | Link your GitHub account via OAuth |
| `/repo owner/repo` | Set your active repository |
| `/task <description>` | Create a coding task — returns an architecture plan |
| `/approve <planId>` | Approve the plan and start code generation |
| `/refine <planId> <notes>` | Request plan changes before approving |
| `/reject <planId>` | Cancel the plan |
| `/amend <planId> <instructions>` | Push additional commits to an existing branch |
| `/status` | Show your linked repo and GitHub connection |
| `/repos` | List accessible repositories |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Models** | Z.AI GLM-4.7-flash (generate/review), GLM-4.7 (plan/orchestrate/security) |
| **AI Routing** | Custom LLM router: SSE streaming, retries, fallback, JSON mode, usage logging |
| **Messaging** | Telegram Bot API, WhatsApp Web.js |
| **Sandbox** | Docker ephemeral containers (network-isolated, memory-limited) |
| **Vector Search** | Supabase pgvector + Z.AI embedding-3 |
| **Version Control** | GitHub REST API via Octokit (issues, branches, commits, PRs) |
| **Backend** | Node.js 22 + Express + TypeScript |
| **Frontend** | React + Vite + Tailwind CSS (landing page) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Monorepo** | Turborepo + npm workspaces |

---

## Z.AI Track — Why DevClaw Qualifies

| Requirement | How DevClaw delivers |
|---|---|
| Z.AI GLM models as core component | 7 distinct agent roles, all running GLM variants — nothing works without Z.AI |
| Meaningful GLM usage across capabilities | Coding, reasoning, orchestration, security analysis, and semantic embedding — all 5 |
| Working prototype, live demo preferred | Fully deployed, runs against real GitHub repos, produces real pull requests |
| Production-ready | Retry logic, fallback routing, idempotent execution, security gate, usage telemetry |
| Beyond a simple demo | Autonomous end-to-end pipeline: plan -> approve -> generate -> review -> test -> secure -> push -> notify |
