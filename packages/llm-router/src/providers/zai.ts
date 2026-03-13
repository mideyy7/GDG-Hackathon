import axios from 'axios';
import { ChatMessage, ChatResponse } from '../types';

/**
 * Generates a text embedding vector via Z.AI's embedding endpoint.
 * Uses the `embedding-3` model which produces 2048-dim vectors by default.
 */
export async function callZaiEmbedding(
  text: string,
  modelId = process.env.ZAI_EMBEDDING_MODEL || 'embedding-3',
  dimensions = 1536,
): Promise<number[]> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error('[llm-router] ZAI_API_KEY is not set');

  const response = await axios.post(
    `${process.env.ZAI_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4'}/embeddings`,
    { model: modelId, input: text, dimensions },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    },
  );

  const embedding: number[] | undefined = response.data?.data?.[0]?.embedding;
  if (!embedding || embedding.length === 0) {
    throw new Error('[llm-router] Z.AI embedding response missing data');
  }
  return embedding;
}

// Z.AI (Zhipu AI) hosts GLM-4, used for the architecture planner role.
// Their API is OpenAI-compatible.
const BASE_URL = process.env.ZAI_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';

export async function callZai(
  modelId: string,
  messages: ChatMessage[],
  temperature = 0.2,
  maxTokens = 4096,
  timeoutMs?: number,
  jsonMode?: boolean,
): Promise<ChatResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error('[llm-router] ZAI_API_KEY is not set');

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
      // Only set axios `timeout` when the caller provides one.
      // Using `!== undefined` (not a falsy check) so that a timeout of 0 ms
      // is still applied — 0 is a valid, if aggressive, deadline.
      ...(timeoutMs !== undefined && { timeout: timeoutMs }),
    },
  );

  // GLM-4.7-Flash uses a two-phase streaming format:
  //   Phase 1 — chain-of-thought: delta.reasoning_content tokens (thinking)
  //   Phase 2 — final answer:     delta.content tokens (the actual reply)
  // We accumulate both separately and return whichever is non-empty, preferring
  // the actual answer (content) when the model completes its reasoning phase.
  let accumulatedContent = '';
  let accumulatedReasoning = '';
  let buffer = '';

  for await (const chunk of response.data) {
    buffer += chunk.toString('utf-8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const dataStr = trimmed.slice(6).trim();
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        // Prefer final answer content; fall back to chain-of-thought reasoning
        if (delta.content) {
          accumulatedContent += delta.content;
        } else if (delta.reasoning_content) {
          accumulatedReasoning += delta.reasoning_content;
        }
      } catch (e) {
        // Ignored, maybe partial chunk
      }
    }
  }

  // Return final answer if the model completed its reasoning phase;
  // otherwise return the reasoning content (e.g. when maxTokens was hit mid-think).
  const content = accumulatedContent || accumulatedReasoning;

  return {
    content,
    model: modelId,
    provider: 'zai',
  };
}
