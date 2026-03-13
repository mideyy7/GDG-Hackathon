# Core Contracts (v0)

All payloads below should be implemented as runtime-validated schemas in `packages/contracts`.

## 1. Incoming Request

```ts
interface IntakeRequest {
  requestId: string;
  channel: "telegram";
  userId: string;
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
  };
  message: string;
  timestampIso: string;
}
```

## 2. Architecture Plan

```ts
interface ArchitecturePlan {
  planId: string;
  requestId: string;
  summary: string;
  affectedFiles: string[];
  agentAssignments: Array<{
    domain: "frontend" | "backend";
    generator: string;
    reviewer: string;
  }>;
  riskFlags: string[];
  status: "pending_approval" | "approved" | "rejected";
}
```

## 3. Agent Run Result

```ts
interface AgentRunResult {
  requestId: string;
  planId: string;
  iteration: number;
  reviewerDecision: "APPROVED" | "REWRITE";
  patchSetRef: string;
  reviewerNotes: string[];
}
```

## 4. Verification Result

```ts
interface VerificationResult {
  requestId: string;
  status: "pass" | "fail";
  checks: Array<{
    name: string;
    passed: boolean;
    details?: string;
  }>;
}
```

## 5. PR Delivery Event

```ts
interface PrDeliveryEvent {
  requestId: string;
  pullRequestUrl: string;
  changelogUpdated: boolean;
  walkthrough: string;
}
```

## 6. Founder Revenue Event

```ts
interface RevenueEvent {
  eventId: string;
  source: "stripe";
  customerHandle: string;
  amountMinor: number;
  currency: "GBP";
  timestampIso: string;
}
```
