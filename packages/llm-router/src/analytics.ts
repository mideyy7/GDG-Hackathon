/**
 * Analytics logger for LLM usage.
 * Fire-and-forget: writes one row per successful chat() call to the
 * `llm_usage_logs` Supabase table via the PostgREST REST API.
 * Uses axios (already a dependency) — no extra packages needed.
 *
 * Required SQL (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS llm_usage_logs (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     created_at  timestamptz NOT NULL DEFAULT now(),
 *     run_id      text,
 *     request_id  text,
 *     role        text NOT NULL,
 *     provider    text NOT NULL,
 *     model       text NOT NULL,
 *     tokens_used integer,
 *     cost_usd    numeric(12, 8),
 *     latency_ms  integer
 *   );
 *
 * Set ANALYTICS_ENABLED=false to disable without changing code.
 */

import axios from 'axios';
import { ModelRole, Provider } from './types';

/** Approximate cost per 1K tokens in USD (Z.AI GLM rates, early 2025) */
const COST_PER_1K: Array<[string, number]> = [
  ['glm-4.7-flash', 0.000140],
  ['glm-4-flash',   0.000140],
  ['glm-4.7',       0.001400],
  ['glm-4-plus',    0.001400],
  ['glm-z1-flash',  0.000070],
  ['glm-z1',        0.007000],
];

function estimateCostUsd(model: string, tokensUsed: number): number | null {
  const normalised = model.toLowerCase();
  for (const [key, rate] of COST_PER_1K) {
    if (normalised.includes(key)) {
      return (tokensUsed / 1000) * rate;
    }
  }
  return null;
}

export interface UsageLogEntry {
  runId?: string;
  requestId?: string;
  role: ModelRole;
  provider: Provider;
  model: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export async function logUsage(entry: UsageLogEntry): Promise<void> {
  if (process.env.ANALYTICS_ENABLED === 'false') return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apiKey) return;

  const costUsd = entry.tokensUsed != null
    ? estimateCostUsd(entry.model, entry.tokensUsed)
    : null;

  try {
    await axios.post(
      `${supabaseUrl}/rest/v1/llm_usage_logs`,
      {
        run_id:      entry.runId ?? null,
        request_id:  entry.requestId ?? null,
        role:        entry.role,
        provider:    entry.provider,
        model:       entry.model,
        tokens_used: entry.tokensUsed ?? null,
        cost_usd:    costUsd,
        latency_ms:  entry.latencyMs ?? null,
      },
      {
        headers: {
          apikey:          apiKey,
          Authorization:   `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
          Prefer:          'return=minimal',
        },
        timeout: 5000,
      },
    );
  } catch {
    // Never let analytics failures surface to callers
  }
}
