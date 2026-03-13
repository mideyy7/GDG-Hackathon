export type RunStatus =
    | "planning"
    | "pending_approval"
    | "approved"
    | "generating"
    | "completed"
    | "rejected"
    | "failed"
    | "security_blocked";

export type RunEventType =
    | "stage_change"
    | "log"
    | "plan_ready"
    | "execution_started"
    | "agent_iteration"
    | "security_scan"
    | "branch_pushed"
    | "pr_opened"
    | "error"
    | "completed";

export interface RunEvent {
    id: string;
    runId: string;
    stage: string;
    eventType: RunEventType;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
}

export interface TaskRun {
    id: string;
    planId: string | null;
    planDetails: ArchitecturePlan | null;
    userId: string;
    repo: string;
    issueUrl: string | null;
    issueNumber: number | null;
    description: string;
    status: RunStatus;
    channel: "telegram" | "whatsapp" | "web";
    chatId: string | null;
    branchName: string | null;
    prUrl: string | null;
    prNumber: number | null;
    createdAt: string;
}

export interface IntakeRequest {
    requestId: string;
    channel: "telegram" | "whatsapp" | "web";
    userId: string;
    repo: {
        owner: string;
        name: string;
        defaultBranch?: string; // Optional? Based on contracts.md it says defaultBranch: string
    };
    message: string;
    timestampIso: string;
    // added so it matches openclaw-gateway payload type checking if needed later, but wait:
    // if gateway still sends chatId, we can optionally add it or let it fail if not in the contract?
    // Let's add chatId as optional string, because Gateway sends it.
    chatId?: string;
}

export interface ArchitecturePlan {
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

export interface AgentRunResult {
    requestId: string;
    planId: string;
    iteration: number;
    reviewerDecision: "APPROVED" | "REWRITE";
    patchSetRef: string;
    reviewerNotes: string[];
}

export interface VerificationResult {
    requestId: string;
    status: "pass" | "fail";
    checks: Array<{
        name: string;
        passed: boolean;
        details?: string;
    }>;
}

export interface PrDeliveryEvent {
    requestId: string;
    pullRequestUrl: string;
    changelogUpdated: boolean;
    walkthrough: string;
}

export interface RevenueEvent {
    eventId: string;
    source: "stripe";
    customerHandle: string;
    amountMinor: number;
    currency: "GBP";
    timestampIso: string;
}

