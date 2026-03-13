# ADR 0001: Monorepo Boundaries for Hackathon Delivery

## Status
Accepted

## Context
The team needs to ship quickly with multiple concurrent workstreams (bot, orchestration, agents, founder loop, dashboard) while keeping contracts stable.

## Decision
Adopt a layered monorepo with three implementation zones:
1. `apps/*` for user-facing surfaces.
2. `services/*` for deployable business capabilities.
3. `packages/*` for shared code and contracts.

## Consequences
- Positive: Parallel development with reduced merge conflict risk.
- Positive: Clear owner boundaries and test scopes.
- Positive: Portable components for post-hackathon extraction.
- Negative: Initial setup overhead and more package wiring.
- Negative: Requires discipline around shared contracts.

## Non-Negotiables
1. `packages/contracts` is versioned and backward compatible during demo week.
2. Only `services/orchestrator` coordinates cross-service workflow.
3. Services communicate via typed contracts, not direct filesystem coupling.
