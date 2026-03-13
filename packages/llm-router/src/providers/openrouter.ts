import axios from 'axios';
import { ChatMessage, ChatResponse } from '../types';

const BASE_URL = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

export async function callOpenRouter(
    modelId: string,
    messages: ChatMessage[],
    temperature = 0.2,
    maxTokens?: number,
    timeoutMs?: number,
    jsonMode?: boolean,
): Promise<ChatResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('[llm-router] OPENROUTER_API_KEY is not set');

    const payload: any = {
        model: modelId,
        messages,
        temperature,
        stream: true,
    };
    if (maxTokens) {
        payload.max_tokens = maxTokens;
    }
    if (jsonMode) {
        payload.response_format = { type: 'json_object' };
    }

    let response: any;
    try {
        response = await axios.post(
            `${BASE_URL}/chat/completions`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'stream',
                ...(timeoutMs !== undefined && { timeout: timeoutMs }),
            },
        );
    } catch (err: any) {
        // For HTTP errors (4xx/5xx), axios with responseType:'stream' may still
        // have the response body accessible. Try to read it for better diagnostics.
        if (axios.isAxiosError(err) && err.response) {
            let body: string | undefined;
            try {
                const chunks: Buffer[] = [];
                for await (const chunk of err.response.data) {
                    chunks.push(Buffer.from(chunk));
                }
                body = Buffer.concat(chunks).toString('utf-8');
            } catch { /* couldn't read stream body */ }
            // Re-throw with the body captured so ProviderHttpError shows it.
            const augmented = Object.assign(err, {
                response: { ...err.response, data: body ?? err.response.data },
            });
            throw augmented;
        }
        throw err;
    }

    // Z.AI GLM models served via OpenRouter also use a two-phase streaming
    // format: reasoning_content (chain-of-thought) then content (final answer).
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

    const content = accumulatedContent || accumulatedReasoning;

    return {
        content,
        model: modelId,
        provider: 'openrouter',
    };
}
