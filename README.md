# DevCore

> Turns user tasks into reviewed GitHub pull requests.

DevCore is an agentic software delivery system for small product teams, founders, and developers who want to go from request -> plan -> approval -> code -> pull request with less manual coordination.

## What It Does

DevCore runs a full delivery workflow instead of stopping at code generation:

1. A user submits a task in natural language
2. DevCore creates an architecture plan with affected files and risks
3. The user approves, rejects, or refines the plan
4. Generator and reviewer agents iterate on the implementation
5. Optional validation stages, including security review, can run before delivery
6. A GitHub branch and pull request are produced for human review

The product can be used through the web dashboard or through Telegram and WhatsApp.

## Why It Exists

Small engineering tasks still require a full coordination cycle:

- finding the right files
- making the change
- reviewing the result
- validating it
- pushing a branch
- opening a PR

Most vibe-coding tools help one person generate code. DevCore is designed to move work through a more complete software delivery workflow.

## Why It Stands Out

DevCore is not a prompt wrapper and not baseline RAG. Its differentiators are workflow-level:

- plan-first execution before code is written
- explicit approval gate
- separate generator and reviewer agents
- repository-aware planning
- GitHub-native output as branches and pull requests
- web-based run visibility through a live Agent Terminal

## Current User Flow

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
  -> generate code, review code, run optional validation stages
GitHub
  -> push branch and open pull request
User
  -> receive status and PR link
```

## Core Features

### 1. Plan Before Code

Every task is turned into a structured architecture plan before execution.

### 2. Generator -> Reviewer Loop

Code generation and code review are handled by separate agent roles, with rewrite feedback when needed.

### 3. Security Gate

The execution pipeline includes a security review stage that can block risky generated code before push.

### 4. Repository-Aware Planning

The planner can use semantic retrieval to identify relevant files and improve planning quality on larger repositories.

### 5. Web Mission Control

The repo includes a dashboard app for:

- GitHub OAuth
- repository selection
- task submission
- run history
- plan approval and refinement
- PR and branch result viewing

### 6. Live Agent Terminal

The dashboard includes a live terminal fed by orchestrator run events over Server-Sent Events.

## Interfaces

### Web Dashboard

`apps/dashboard` provides:

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

### Chat Interfaces

`apps/telegram-bot` and `apps/whatsapp-bot` support:

- `/login`
- `/repo owner/repo`
- `/task <description>`
- `/approve <planId>`
- `/refine <planId> <notes>`
- `/reject <planId>`
- `/amend <planId> <instructions>`
- `/status`
- `/repos`

## Architecture

### Applications

- `apps/dashboard` - web Mission Control
- `apps/landing-page` - marketing site
- `apps/telegram-bot` - Telegram interface
- `apps/whatsapp-bot` - WhatsApp interface

### Services

- `services/openclaw-gateway` - ingress, OAuth, routing, repo/user correlation
- `services/orchestrator` - workflow state, approval, dispatch, run events, SSE streaming
- `services/openclaw-engine` - planning, plan revision, semantic context retrieval
- `services/agent-runner` - execution loop, review loop, validation/security orchestration

### Packages

- `packages/contracts` - shared types and contracts
- `packages/llm-router` - provider/model routing, retries, JSON mode, usage logging

## Tech Stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| Monorepo        | Turborepo + npm workspaces             |
| Backend         | Node.js + Express + TypeScript         |
| Frontend        | React + Vite + Tailwind CSS            |
| Messaging       | Telegram Bot API, WhatsApp Web.js      |
| Persistence     | Supabase PostgreSQL                    |
| Retrieval       | pgvector-based semantic search         |
| Version Control | GitHub API                             |
| AI Routing      | Custom router in `packages/llm-router` |

## Model Usage

AI models are used as infrastructure inside a larger workflow, not as the product itself.

In the current implementation:

- planning, orchestration, and security review are routed through OpenRouter-backed calls
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
- GitHub OAuth app configuration and/or GitHub token
- required model provider keys for the configured routing setup
- Docker if you want sandboxed execution

### Install

```bash
npm install
```

### Run Backend Services

```bash
npx turbo run dev \
  --filter=openclaw-gateway \
  --filter=orchestrator \
  --filter=openclaw-engine \
  --filter=agent-runner \
  --concurrency=10
```

### Run Dashboard

```bash
npx turbo run dev --filter=@devclaw/dashboard
```

### Run Landing Page

```bash
npx turbo run dev --filter=@devclaw/landing-page
```

### Run Everything

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

Each service expects its own `.env` file. At minimum, review and configure:

- `services/openclaw-gateway/.env`
- `services/orchestrator/.env`
- `services/openclaw-engine/.env`
- `services/agent-runner/.env`
- `apps/telegram-bot/.env`
- `apps/whatsapp-bot/.env`

Typical required values include:

- Supabase URL and service role key
- GitHub OAuth credentials and/or GitHub token
- model provider API keys
- bot tokens where applicable
- service-to-service URLs

## Summary
====================================
PROBLEM
=====================================
Most AI coding tools focus on generating code snippets, but they do not support the full software delivery workflow used by real engineering teams. As a result, developers still have to manually coordinate delivery, changes often lack structured planning and review, and AI-generated code can bypass important safety, security, or architectural considerations.
In addition, collaboration becomes difficult when using AI coding platforms. AI tools are typically used by individuals in isolated interfaces, making it harder for teams to discuss changes, coordinate tasks, and maintain shared visibility over what the AI is generating.
This creates a clear gap between AI code generation and the collaborative workflows required to safely deliver software in real engineering environments.

=============================================
SOLUTION
=============================================
DevCore is an agentic software delivery system that converts tasks into reviewed GitHub pull requests through a structured workflow.DevCore follows a plan-first delivery pipeline:
I. A user submits a task
II. DevCore analyzes the repository and generates an architecture plan
III. The user can approve, reject, or refine the plan
IV.  Generator and reviewer agents iterate on the implementation
V. Validation and security checks run before pushing to Github

This ensures AI-generated code follows the same disciplined workflow used by engineering teams, including planning, review, and validation.

DevCore can be accessed through:
-a web dashboard
-WhatsApp
-Telegram

The WhatsApp interface can be integrated directly into team group chats, allowing developers to trigger tasks, review plans, and coordinate delivery without leaving their communication channel. This enables teams to collaborate with DevCore in the same place they already discuss features, bugs, and deployment decisions.


===================================================
IMPACT
===================================================

DevCore reduces the coordination overhead of software delivery while preserving key engineering safeguards.

1. Faster development cycles
Tasks can move from request to pull request automatically, reducing the manual effort required to ship smaller changes.

2. Safer AI-assisted development
The plan approval gate and reviewer agents help prevent risky, poorly structured, or misaligned code from reaching the repository.

3. Workflow-level automation
Unlike traditional code copilots, DevCore automates the entire delivery workflow, not just code generation.

4. Collaborative development through messaging platforms
By integrating with WhatsApp group chats, DevCore allows engineering teams to request features, approve architecture plans, and monitor delivery progress directly inside their team conversations. This makes structured software delivery accessible within the same environment where teams already collaborate.
