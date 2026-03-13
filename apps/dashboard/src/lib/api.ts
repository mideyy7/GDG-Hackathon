/**
 * API client for Web Mission Control.
 *
 * All requests to the gateway (/api/web/*) include X-Session-Token.
 * All requests to the orchestrator (/orchestrator/*) are proxied via Vite
 * in dev, or served via the same gateway in production.
 */

import axios from 'axios';
import { getSessionId } from './session';

const GATEWAY_BASE = '/api';
const ORCHESTRATOR_BASE = '/orchestrator';

export interface UserStatus {
  authenticated: boolean;
  linkedRepo: string | null;
}

export interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  description: string | null;
}

export interface TaskRunSummary {
  id: string;
  planId: string | null;
  userId: string;
  repo: string;
  issueUrl: string | null;
  issueNumber: number | null;
  description: string;
  status: string;
  channel: string;
  branchName: string | null;
  prUrl: string | null;
  prNumber: number | null;
  createdAt: string;
}

export interface ArchitecturePlan {
  planId: string;
  requestId: string;
  summary: string;
  affectedFiles: string[];
  agentAssignments: Array<{
    domain: 'frontend' | 'backend';
    generator: string;
    reviewer: string;
  }>;
  riskFlags: string[];
  status: 'pending_approval' | 'approved' | 'rejected';
}

export interface TaskRunDetail extends TaskRunSummary {
  planDetails: ArchitecturePlan | null;
}

export interface RunEvent {
  id: string;
  runId: string;
  stage: string;
  eventType: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

const sessionHeaders = () => {
  const id = getSessionId();
  return id ? { 'X-Session-Token': id } : {};
};

const orchestratorHeaders = () => sessionHeaders();

// ── Gateway Web API ──────────────────────────────────────────────────────────

export const fetchUserStatus = async (): Promise<UserStatus> => {
  const { data } = await axios.get(`${GATEWAY_BASE}/web/me`, {
    headers: sessionHeaders(),
  });
  return data;
};

export const fetchGitHubRepos = async (): Promise<GitHubRepo[]> => {
  const { data } = await axios.get(`${GATEWAY_BASE}/web/repos`, {
    headers: sessionHeaders(),
  });
  return data.repos;
};

export const linkRepository = async (repo: string): Promise<void> => {
  await axios.post(
    `${GATEWAY_BASE}/web/repo-link`,
    { repo },
    { headers: sessionHeaders() }
  );
};

export const submitTask = async (
  description: string,
  repo?: string
): Promise<{ success: boolean; runId: string; issueUrl: string; message: string }> => {
  const { data } = await axios.post(
    `${GATEWAY_BASE}/web/task`,
    { description, repo },
    { headers: sessionHeaders() }
  );
  return data;
};

/** Build the GitHub OAuth URL for the web user. */
export const getGitHubOAuthUrl = (userId: string): string => {
  return `${GATEWAY_BASE}/web/auth/github?userId=${encodeURIComponent(userId)}`;
};

// ── Orchestrator Runs API ────────────────────────────────────────────────────

export const fetchRuns = async (
  limit = 20,
  offset = 0
): Promise<{ runs: TaskRunSummary[]; total: number }> => {
  const { data } = await axios.get(
    `${ORCHESTRATOR_BASE}/api/runs?limit=${limit}&offset=${offset}`,
    { headers: orchestratorHeaders() }
  );
  return data;
};

export const fetchRun = async (runId: string): Promise<TaskRunDetail> => {
  const { data } = await axios.get(`${ORCHESTRATOR_BASE}/api/runs/${runId}`, {
    headers: orchestratorHeaders(),
  });
  return data;
};

export const approveRun = async (runId: string): Promise<void> => {
  await axios.post(
    `${ORCHESTRATOR_BASE}/api/runs/${runId}/approve`,
    {},
    { headers: orchestratorHeaders() }
  );
};

export const rejectRun = async (runId: string): Promise<void> => {
  await axios.post(
    `${ORCHESTRATOR_BASE}/api/runs/${runId}/reject`,
    {},
    { headers: orchestratorHeaders() }
  );
};

export const refineRun = async (runId: string, refinement: string): Promise<void> => {
  await axios.post(
    `${ORCHESTRATOR_BASE}/api/runs/${runId}/refine`,
    { refinement },
    { headers: orchestratorHeaders() }
  );
};

/**
 * Open an SSE connection to /api/runs/:runId/events.
 * Returns an EventSource that emits RunEvent objects.
 *
 * Note: EventSource doesn't support custom headers in browsers.
 * We pass the session token as a query parameter instead.
 */
export const openRunEventStream = (runId: string): EventSource => {
  const sessionId = getSessionId();
  const url = `${ORCHESTRATOR_BASE}/api/runs/${runId}/events?token=${encodeURIComponent(sessionId || '')}`;
  return new EventSource(url);
};
