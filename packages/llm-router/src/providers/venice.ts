import axios from 'axios';
import { ChatMessage, ChatResponse } from '../types';

// Venice.ai is the fallback for the generator — chosen because it explicitly
// does not log or train on input content, protecting customer codebase IP.
const BASE_URL = process.env.VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1';

export async function callVenice(
  modelId: string,
  messages: ChatMessage[],
  temperature = 0.2,
  maxTokens = 4_096_000,
  timeoutMs?: number,
): Promise<ChatResponse> {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) throw new Error('[llm-router] VENICE_API_KEY is not set');

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
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

  let accumulatedContent = '';
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
        if (parsed.choices?.[0]?.delta?.content) {
          accumulatedContent += parsed.choices[0].delta.content;
        }
      } catch (e) {
        // Ignored, maybe partial chunk
      }
    }
  }

  return {
    content: accumulatedContent,
    model: modelId,
    provider: 'venice',
  };
}
