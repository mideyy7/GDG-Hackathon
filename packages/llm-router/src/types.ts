// The logical name for which agent is making the call.
// llm-router uses this to decide which model + provider to use.
export type ModelRole =
  | 'generator'
  | 'reviewer'
  | 'frontend_generator'
  | 'frontend_reviewer'
  | 'backend_generator'
  | 'backend_reviewer'
  | 'orchestrator'
  | 'planner'
  | 'security_reviewer';

// The actual AI provider companies.
// Z.AI is the core engine. OpenRouter is the fallback route to the same GLM models.
export type Provider = 'venice' | 'zai' | 'openrouter';

// A single message in a conversation — same shape as OpenAI's API format,
// which all three providers follow.
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// What the caller (e.g. agent-runner) sends to llm-router.
export interface ChatRequest {
  role: ModelRole;
  messages: ChatMessage[];
  temperature?: number;  // 0.0–1.0, lower = more deterministic
  maxTokens?: number;
  jsonMode?: boolean;    // if true, passes response_format:{type:"json_object"} to force JSON output
  requestId?: string;    // propagated into any error thrown, for tracing
}

// What llm-router returns after a successful call.
export interface ChatResponse {
  content: string;    // the model's reply text
  model: string;      // exact model ID that was used
  provider: Provider; // which provider actually handled the call
  tokensUsed?: number;
}
