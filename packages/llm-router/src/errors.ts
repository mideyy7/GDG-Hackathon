import { ModelRole, Provider } from './types';

// Fields included on every error that comes out of llm-router,
// so callers can log or make decisions without parsing a message string.
export interface RouterErrorContext {
  role: ModelRole;
  provider: Provider;
  model: string;
  requestId?: string;
}

// Base class. Catch this if you want to handle any llm-router failure.
export class RouterError extends Error {
  readonly role: ModelRole;
  readonly provider: Provider;
  readonly model: string;
  readonly requestId: string | undefined;

  constructor(message: string, ctx: RouterErrorContext) {
    super(message);
    this.name = 'RouterError';
    this.role = ctx.role;
    this.provider = ctx.provider;
    this.model = ctx.model;
    this.requestId = ctx.requestId;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// The provider returned a 4xx or 5xx HTTP response.
// statusCode lets callers distinguish permanent failures (401, 404)
// from transient ones (429, 503) without string-matching the message.
export class ProviderHttpError extends RouterError {
  readonly statusCode: number;
  readonly responseBody: unknown;

  constructor(ctx: RouterErrorContext & { statusCode: number; responseBody?: unknown }) {
    super(
      `[${ctx.provider}] HTTP ${ctx.statusCode} calling model "${ctx.model}" for role "${ctx.role}"`,
      ctx,
    );
    this.name = 'ProviderHttpError';
    this.statusCode = ctx.statusCode;
    this.responseBody = ctx.responseBody;
  }
}

// The provider connection timed out or was aborted before returning a response.
export class ProviderTimeoutError extends RouterError {
  constructor(ctx: RouterErrorContext) {
    super(
      `[${ctx.provider}] Timed out calling model "${ctx.model}" for role "${ctx.role}"`,
      ctx,
    );
    this.name = 'ProviderTimeoutError';
  }
}
