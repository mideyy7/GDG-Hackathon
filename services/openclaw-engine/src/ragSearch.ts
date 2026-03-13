/**
 * RAG Search — finds the most semantically similar files to a query
 * using pgvector cosine similarity on embeddings stored in Supabase.
 *
 * Returns ranked file paths + snippets that the planner can use as context.
 */

import axios from 'axios';
import { callZaiEmbedding } from '@devclaw/llm-router';

export interface RagSearchResult {
  filePath: string;
  score: number;
  snippet: string;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
}

/**
 * Searches for the top-k most relevant files for a given query string.
 *
 * Uses a Supabase RPC function `match_file_embeddings` (pgvector cosine similarity).
 * If the RPC is unavailable or RAG is disabled, returns an empty array.
 *
 * Required SQL (run once):
 *
 *   CREATE OR REPLACE FUNCTION match_file_embeddings(
 *     query_embedding vector(1536),
 *     match_repo      text,
 *     match_count     int DEFAULT 10
 *   )
 *   RETURNS TABLE(file_path text, content text, similarity float)
 *   LANGUAGE sql STABLE AS $$
 *     SELECT file_path, content,
 *            1 - (embedding <=> query_embedding) AS similarity
 *     FROM file_embeddings
 *     WHERE repo = match_repo
 *     ORDER BY embedding <=> query_embedding
 *     LIMIT match_count;
 *   $$;
 */
export async function ragSearch(
  repo: string,
  query: string,
  topK = 8,
): Promise<RagSearchResult[]> {
  if (process.env.RAG_ENABLED === 'false') return [];

  const { url, key } = getSupabaseConfig();
  if (!url || !key) return [];

  try {
    const embedding = await callZaiEmbedding(query);

    // PostgREST requires pgvector inputs to be sent as a string "[x,y,...]" rather
    // than a raw JSON array — passing a JS number[] causes a 400 Bad Request.
    const embeddingStr = `[${embedding.join(',')}]`;

    const response = await axios.post(
      `${url}/rest/v1/rpc/match_file_embeddings`,
      {
        query_embedding: embeddingStr,
        match_repo: repo,
        match_count: topK,
      },
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      },
    );

    const rows: Array<{ file_path: string; content: string; similarity: number }> =
      response.data ?? [];

    return rows.map((r) => ({
      filePath: r.file_path,
      score: r.similarity,
      snippet: r.content.slice(0, 400),
    }));
  } catch (err: any) {
    const detail = err?.response?.data
      ? ` — ${JSON.stringify(err.response.data).slice(0, 200)}`
      : '';
    console.warn(`[RAG] Search failed for repo=${repo}: ${err?.message}${detail}`);
    return [];
  }
}

/**
 * Formats RAG results into a compact string suitable for inclusion in planner prompts.
 */
export function formatRagContext(results: RagSearchResult[]): string {
  if (results.length === 0) return '';
  const lines = [
    '--- Semantically relevant files (RAG context) ---',
    ...results.map(
      (r) =>
        `[${r.filePath}] (similarity=${r.score.toFixed(3)})\n${r.snippet}${r.snippet.length >= 400 ? '...' : ''}`,
    ),
    '---',
  ];
  return lines.join('\n\n');
}
