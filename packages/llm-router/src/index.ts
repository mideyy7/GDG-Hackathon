import axios from 'axios';
import { ChatRequest, ChatResponse, Provider } from './types';
import { MODEL_CONFIG, FallbackTrigger } from './config';
import { RouterError, ProviderHttpError, ProviderTimeoutError } from './errors';
import { callVenice } from './providers/venice';
import { callZai } from './providers/zai';
import { callOpenRouter } from './providers/openrouter';
import { logUsage } from './analytics';

const toCompactJson = (value: unknown, fallback = 'n/a'): string => {
  if (value === undefined) return fallback;
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length > 400 ? `${value.slice(0, 400)}...(truncated)` : value;
  }
  try {
    const json = JSON.stringify(value);
    return json.length > 400 ? `${json.slice(0, 400)}...(truncated)` : json;
  } catch {
    return fallback;
  }
};

const describeError = (err: unknown): string => {
  if (err instanceof ProviderHttpError) {
    return `${err.message}; requestId=${err.requestId || 'n/a'}; ` +
      `responseBody=${toCompactJson(err.responseBody)}`;
  }
  if (err instanceof ProviderTimeoutError) {
    return `${err.message}; requestId=${err.requestId || 'n/a'}`;
  }
  if (err instanceof RouterError) {
    return `${err.message}; role=${err.role}; provider=${err.provider}; model=${err.model}; ` +
      `requestId=${err.requestId || 'n/a'}`;
  }
  return err instanceof Error ? err.message : String(err);
};

// Returns true if this error is in the role's fallbackOn list, meaning it is
// safe to retry or fall back. Permanent errors like 401/403 are never in the
// list so they surface immediately without wasting a fallback attempt.
function shouldFallback(err: unknown, triggers: FallbackTrigger[]): boolean {
  if (triggers.includes('any')) return true;
  if (triggers.includes('timeout') && err instanceof ProviderTimeoutError) return true;
  if (err instanceof ProviderHttpError) {
    if (triggers.includes('http5xx') && err.statusCode >= 500) return true;
    if (triggers.includes('http429') && err.statusCode === 429) return true;
    if (triggers.includes('http4xx') && err.statusCode >= 400 && err.statusCode < 500) return true;
  }
  return false;
}

// Internal helper — dispatches to the right provider function and wraps any
// raw axios/network error into a typed RouterError subclass.
async function callProvider(
  provider: Provider,
  modelId: string,
  req: ChatRequest,
  timeoutMs?: number,
): Promise<ChatResponse> {
  // ctx is passed into every error we throw so callers can log which role,
  // provider, and request was in flight when the failure happened.
  const ctx = { role: req.role, provider, model: modelId, requestId: req.requestId };

  try {
    const { messages, temperature, maxTokens, jsonMode } = req;
    switch (provider) {
      case 'venice': return await callVenice(modelId, messages, temperature, maxTokens, timeoutMs);
      case 'zai': return await callZai(modelId, messages, temperature, maxTokens, timeoutMs, jsonMode);
      case 'openrouter': return await callOpenRouter(modelId, messages, temperature, maxTokens, timeoutMs, jsonMode);
      default: {
        // TypeScript exhaustiveness check: if a new Provider value is added to
        // the union in types.ts but not handled here, the compiler will error
        // because `provider` can no longer be assigned to `never`.
        const _exhaustive: never = provider;
        throw new Error(`[llm-router] Unknown provider: ${_exhaustive}`);
      }
    }
  } catch (err) {
    // If the provider function already threw a typed RouterError (e.g. because
    // it validated the API key before calling axios), re-throw it unchanged so
    // we don't lose the original type and context by wrapping it a second time.
    if (err instanceof RouterError) throw err;

    if (axios.isAxiosError(err)) {
      if (err.response) {
        throw new ProviderHttpError({
          ...ctx,
          statusCode: err.response.status,
          responseBody: err.response.data,
        });
      }
      // If we didn't receive an HTTP response, it's a network-level error 
      // (timeout, ECONNRESET, ENOTFOUND, ERR_CANCELED, etc).
      // We map all of these to ProviderTimeoutError to leverage the existing retry policy.
      throw new ProviderTimeoutError(ctx);
    }

    // Sometimes Axios stream reading phase throws a raw Error instead of AxiosError 
    // when the underlying socket is abruptly closed or aborted.
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      // "aborted", "socket hang up", "econnreset" etc.
      if (
        msg === 'aborted' ||
        msg === 'socket hang up' ||
        msg.includes('econnreset') ||
        (err as any).code === 'ECONNRESET'
      ) {
        throw new ProviderTimeoutError(ctx);
      }
    }

    // Non-axios error (e.g. missing API key check from provider file).
    throw new RouterError(err instanceof Error ? err.message : String(err), ctx);
  }
}

// The one function every other service in DevClaw calls.
//
// Usage:
//   import { chat } from '@devclaw/llm-router';
//   const reply = await chat({ role: 'generator', messages: [...], requestId: '...' });
//
// Flow: try primary up to (1 + maxRetries) times, then try fallback if eligible.
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const config = MODEL_CONFIG[req.role];
  if (!config) {
    throw new Error(`[llm-router] No model config for role: ${req.role}`);
  }

  const { timeoutMs, maxRetries, fallbackOn } = config.policy;
  const maxAttempts = 1 + maxRetries;
  let lastErr: unknown;
  let attemptsMade = 0;

  // Apply policy-level maxTokens and jsonMode as defaults when the caller hasn't set them.
  // This allows per-role token budgets and JSON-mode enforcement without requiring every
  // call site to pass these explicitly.
  let effectiveReq: ChatRequest = req;
  if (req.maxTokens === undefined && config.policy.maxTokens !== undefined) {
    effectiveReq = { ...effectiveReq, maxTokens: config.policy.maxTokens };
  }
  if (req.jsonMode === undefined && config.policy.jsonMode !== undefined) {
    effectiveReq = { ...effectiveReq, jsonMode: config.policy.jsonMode };
  }

  // Retry loop — keeps trying the primary provider while:
  //   (a) the error is listed in fallbackOn (i.e. transient, worth retrying), and
  //   (b) we still have attempts remaining.
  // Permanent errors (e.g. 401) break out immediately on the first failure.
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsMade = attempt;
    try {
      const t0 = Date.now();
      const response = await callProvider(config.provider, config.modelId, effectiveReq, timeoutMs);
      logUsage({
        runId: (effectiveReq as any).runId,
        requestId: effectiveReq.requestId,
        role: effectiveReq.role,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: Date.now() - t0,
      }).catch(() => { });
      return response;
    } catch (err) {
      lastErr = err;
      const retryable = shouldFallback(err, fallbackOn);
      if (!retryable || attempt === maxAttempts) break;
      console.warn(
        `[llm-router] Attempt ${attempt}/${maxAttempts} failed for role "${effectiveReq.role}" on ` +
        `"${config.provider}" — retrying. Reason: ${describeError(err)}`,
      );
    }
  }

  // After exhausting retries, try the fallback provider if configured and eligible.
  if (config.fallback && shouldFallback(lastErr, fallbackOn)) {
    console.warn(
      `[llm-router] Primary "${config.provider}" exhausted for role "${effectiveReq.role}" — ` +
      `falling back to "${config.fallback.provider}". Reason: ${describeError(lastErr)}`,
    );
    const t0 = Date.now();
    const response = await callProvider(config.fallback.provider, config.fallback.modelId, effectiveReq, timeoutMs);
    logUsage({
      runId: (effectiveReq as any).runId,
      requestId: effectiveReq.requestId,
      role: effectiveReq.role,
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs: Date.now() - t0,
    }).catch(() => { });
    return response;
  }

  console.error(
    `[llm-router] Request failed for role "${effectiveReq.role}" on provider "${config.provider}" after ` +
    `${attemptsMade} attempt(s). Error: ${describeError(lastErr)}`,
  );
  throw lastErr;
}

// Re-export types so callers don't need to import from internal paths.
export type { ChatRequest, ChatResponse, ChatMessage, ModelRole, Provider } from './types';
export { RouterError, ProviderHttpError, ProviderTimeoutError } from './errors';
export { callZaiEmbedding } from './providers/zai';
