import { ModelRole, Provider } from './types';

// Which error types are considered transient and worth retrying / falling back on.
// 'any'     — always retry/fallback (original behaviour)
// 'timeout' — only on ProviderTimeoutError
// 'http5xx' — only on ProviderHttpError with statusCode >= 500
// 'http429' — only on ProviderHttpError with statusCode 429 (rate limit)
export type FallbackTrigger = 'any' | 'timeout' | 'http5xx' | 'http429' | 'http4xx';

export interface RolePolicy {
  timeoutMs: number;              // per-call axios timeout
  maxRetries: number;             // retries on primary before giving up / falling back
  fallbackOn: FallbackTrigger[];  // error types that are eligible for retry + fallback
  maxTokens?: number;             // max tokens to request from the provider (overrides provider default)
  jsonMode?: boolean;             // if true, forces response_format:{type:"json_object"} on the provider call
}

// For each role, defines which provider + model to call,
// an optional fallback, and the runtime policy for that role.
export interface ModelConfig {
  provider: Provider;
  modelId: string;
  fallback?: {
    provider: Provider;
    modelId: string;
  };
  policy: RolePolicy;
}

// ─── Z.AI GLM model selection ─────────────────────────────────────────────────
//
// Three GLM models are used, each routed to the best available path:
//
//   glm-4.7-flash  — direct Z.AI API  (confirmed working; generation/review)
//   glm-z1-flash   — OpenRouter       (dedicated reasoning model; orchestration/qualification)
//   glm-4-long     — OpenRouter       (128k-context model; architecture planning)
//
// For models unavailable on the direct Z.AI key, OpenRouter is the PRIMARY
// provider. The safety net for those roles falls back to glm-4.7-flash direct.
//
// Override via env vars to switch models without a redeploy.

// Direct Z.AI (open.bigmodel.cn) — glm-4.7-flash confirmed available
const ZAI_FLASH_MODEL    = process.env.GENERATOR_MODEL   || 'glm-4.7-flash';
const ZAI_REVIEWER_MODEL = process.env.REVIEWER_MODEL    || 'glm-4.7-flash';

// OpenRouter paths for models not directly reachable on this key
// Confirmed model IDs on OpenRouter as of 2025:
//   thudm/glm-z1-32b  — GLM-Z1-32B-0414 reasoning/CoT model (THUDM/ZhipuAI)
//   z-ai/glm-4.7      — Z.AI flagship, 203k context
//   z-ai/glm-4.5-air  — fast/cheap Z.AI model for fallback
// thudm/glm-z1-32b has "no endpoints" on OpenRouter — use z-ai/glm-4.7 (203k ctx) instead
const OR_REASONING_MODEL = process.env.OR_REASONING_MODEL || 'z-ai/glm-4.7';
const OR_LONGCTX_MODEL   = process.env.OR_LONGCTX_MODEL   || 'z-ai/glm-4.7';
const OR_FLASH_FALLBACK  = process.env.OR_FLASH_MODEL     || 'z-ai/glm-4.5-air';

const GENERATOR_POLICY: RolePolicy = {
  timeoutMs: 1200_000,
  maxRetries: 2,
  fallbackOn: ['timeout', 'http5xx', 'http429'],
  // GLM-4.7-Flash uses two-phase streaming: reasoning_content (CoT) then content (answer).
  // With the default 4096 tokens, the model exhausts its budget in the thinking phase and
  // never produces delta.content. 16384 gives enough room for both phases.
  maxTokens: 16384,
  // Force JSON output via response_format so the model doesn't emit markdown analysis text.
  jsonMode: true,
};

const REVIEWER_POLICY: RolePolicy = {
  timeoutMs: 600_000,
  maxRetries: 2,
  fallbackOn: ['timeout', 'http5xx', 'http429'],
};

const REASONING_POLICY: RolePolicy = {
  timeoutMs: 180_000,
  maxRetries: 1,
  fallbackOn: ['timeout', 'http5xx', 'http429', 'http4xx'],
};

const LONGCTX_POLICY: RolePolicy = {
  timeoutMs: 900_000,
  maxRetries: 1,
  fallbackOn: ['timeout', 'http5xx', 'http4xx'],
};

// ─── Model config ─────────────────────────────────────────────────────────────
export const MODEL_CONFIG: Record<ModelRole, ModelConfig> = {

  // ── DevClaw: code generation ─────────────────────────────────────────────────
  // glm-4.7-flash via direct Z.AI — fast generation with native CoT

  generator: {
    provider: 'zai',
    modelId: ZAI_FLASH_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: GENERATOR_POLICY,
  },

  reviewer: {
    provider: 'zai',
    modelId: ZAI_REVIEWER_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: REVIEWER_POLICY,
  },

  frontend_generator: {
    provider: 'zai',
    modelId: ZAI_FLASH_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: GENERATOR_POLICY,
  },

  frontend_reviewer: {
    provider: 'zai',
    modelId: ZAI_REVIEWER_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: REVIEWER_POLICY,
  },

  backend_generator: {
    provider: 'zai',
    modelId: ZAI_FLASH_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: GENERATOR_POLICY,
  },

  backend_reviewer: {
    provider: 'zai',
    modelId: ZAI_REVIEWER_MODEL,
    fallback: { provider: 'openrouter', modelId: OR_FLASH_FALLBACK },
    policy: REVIEWER_POLICY,
  },

  // ── DevClaw: reasoning & orchestration ───────────────────────────────────────
  // glm-z1-flash via OpenRouter — deep reasoning / chain-of-thought
  // glm-4-long  via OpenRouter — 128k context for full-codebase planning

  orchestrator: {
    provider: 'openrouter',
    modelId: OR_REASONING_MODEL,
    fallback: { provider: 'zai', modelId: ZAI_FLASH_MODEL },
    policy: REASONING_POLICY,
  },

  planner: {
    provider: 'openrouter',
    modelId: OR_LONGCTX_MODEL,
    fallback: { provider: 'zai', modelId: ZAI_FLASH_MODEL },
    policy: LONGCTX_POLICY,
  },

  // ── DevClaw: security gate ────────────────────────────────────────────────────
  // glm-4.7 via OpenRouter — OWASP Top 10 vulnerability scan on final diff.
  // Uses the full reasoning model to detect injection, secrets, auth flaws, etc.
  // Falls back to glm-4.7-flash direct if OpenRouter is unavailable.

  security_reviewer: {
    provider: 'openrouter',
    modelId: process.env.SECURITY_MODEL || OR_REASONING_MODEL,
    fallback: { provider: 'zai', modelId: ZAI_FLASH_MODEL },
    policy: {
      timeoutMs: 240_000,
      maxRetries: 1,
      fallbackOn: ['timeout', 'http5xx', 'http429'],
    },
  },

};
