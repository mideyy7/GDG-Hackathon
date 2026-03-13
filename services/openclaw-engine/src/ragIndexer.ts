/**
 * RAG Indexer — embeds repository files and stores vectors in Supabase pgvector.
 *
 * Required Supabase setup (run once in SQL editor):
 *
 *   -- Enable pgvector
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *
 *   -- File embeddings table
 *   CREATE TABLE IF NOT EXISTS file_embeddings (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     created_at  timestamptz NOT NULL DEFAULT now(),
 *     repo        text NOT NULL,
 *     file_path   text NOT NULL,
 *     content     text NOT NULL,
 *     embedding   vector(1536),
 *     UNIQUE (repo, file_path)
 *   );
 *
 *   -- IVFFlat index for fast approximate nearest-neighbour search
 *   CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx
 *     ON file_embeddings USING ivfflat (embedding vector_cosine_ops)
 *     WITH (lists = 100);
 *
 * Set RAG_ENABLED=false to disable without changing code.
 */

import axios from 'axios';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { callZaiEmbedding } from '@devclaw/llm-router';

/** Maximum characters per file to embed (keeps token count manageable) */
const MAX_FILE_CHARS = 8000;

/** File extensions to index — skip binaries, lock files, etc. */
const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md', '.mdx', '.txt', '.sh', '.bash',
  '.css', '.scss', '.html',
  '.sql', '.prisma', '.graphql',
]);

/** Files/directories to always skip */
const SKIP_PATTERNS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.turbo'];

function isIndexable(filePath: string): boolean {
  if (SKIP_PATTERNS.some((p) => filePath.includes(p))) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
}

async function upsertEmbedding(
  repo: string,
  filePath: string,
  content: string,
  embedding: number[],
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return;

  // PostgREST expects pgvector values as a string "[x,y,...]"
  await axios.post(
    `${url}/rest/v1/file_embeddings`,
    { repo, file_path: filePath, content, embedding: `[${embedding.join(',')}]` },
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      timeout: 10_000,
    },
  );
}

export interface IndexRepoInput {
  /** GitHub repo full name, e.g. "owner/repo" */
  repo: string;
  /** Absolute path to the local workspace / clone */
  workspacePath: string;
  /** File list (relative paths from workspacePath) */
  files: string[];
}

export interface IndexRepoResult {
  indexed: number;
  skipped: number;
  errors: number;
}

/**
 * Embeds a batch of repo files and stores them in Supabase.
 * Processes files sequentially to avoid rate limits.
 */
export async function indexRepo(input: IndexRepoInput): Promise<IndexRepoResult> {
  if (process.env.RAG_ENABLED === 'false') {
    return { indexed: 0, skipped: input.files.length, errors: 0 };
  }

  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    console.warn('[RAG] Supabase not configured — skipping indexing');
    return { indexed: 0, skipped: input.files.length, errors: 0 };
  }

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  for (const relPath of input.files) {
    if (!isIndexable(relPath)) {
      skipped++;
      continue;
    }

    try {
      const absPath = path.join(input.workspacePath, relPath);
      const raw = await readFile(absPath, 'utf-8');
      const content = raw.slice(0, MAX_FILE_CHARS);

      const textToEmbed = `File: ${relPath}\n\n${content}`;
      const embedding = await callZaiEmbedding(textToEmbed);

      await upsertEmbedding(input.repo, relPath, content, embedding);
      indexed++;
    } catch (err: any) {
      console.warn(`[RAG] Failed to index ${relPath}: ${err?.message}`);
      errors++;
    }
  }

  console.log(`[RAG] Indexed ${indexed} files for ${input.repo} (skipped=${skipped}, errors=${errors})`);
  return { indexed, skipped, errors };
}
