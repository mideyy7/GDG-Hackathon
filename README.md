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

- a web dashboard for GitHub login, repo linking, task submission, run monitoring, and plan approval
- WhatsApp and Telegram task intake
- GitHub OAuth and repository linking
- architecture planning and refinement
- execution dispatch and agent coordination
- live run events streamed into the dashboard via SSE
- security scanning support in the execution pipeline
- PR delivery back to the user

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

### Applications

- `apps/dashboard` - web Mission Control for login, repos, tasks, run history, and live execution
- `apps/landing-page` - marketing site and public product presentation
- `apps/telegram-bot` - Telegram intake and outbound messaging
- `apps/whatsapp-bot` - WhatsApp intake and outbound messaging

### Services

- `services/openclaw-gateway` - central ingress, OAuth, routing, repo/user correlation
- `services/orchestrator` - workflow state management, issue creation, approval, dispatch, run events, SSE streaming
- `services/openclaw-engine` - planning, plan revision, semantic context retrieval
- `services/agent-runner` - execution loop, review loop, test/security orchestration

### Packages

- `packages/contracts` - shared types and contracts
- `packages/llm-router` - provider/model routing, retries, JSON mode, usage logging

## Tech Stack

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

- Node.js 20+
- npm 10+
- Supabase project
- GitHub token / OAuth app configuration
- required model provider keys for the configured routing setup
- Docker if you want sandboxed execution

### Install

```bash
npm install
```

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

## Bot Commands

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


