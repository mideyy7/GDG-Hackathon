-- Migration: Add run_events table for live agent terminal streaming
-- This table stores all lifecycle events for a task run,
-- powering the SSE event stream in the Web Mission Control dashboard.

CREATE TABLE IF NOT EXISTS run_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID        NOT NULL REFERENCES task_runs(id) ON DELETE CASCADE,
  stage       TEXT        NOT NULL,
  event_type  TEXT        NOT NULL,
  message     TEXT        NOT NULL DEFAULT '',
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookup by run_id ordered by time
CREATE INDEX IF NOT EXISTS idx_run_events_run_id_created_at
  ON run_events (run_id, created_at ASC);

-- Enable Row Level Security (if Supabase RLS is in use)
ALTER TABLE run_events ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do everything (used by backend)
CREATE POLICY "Service role full access" ON run_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE run_events IS
  'Lifecycle events for task runs, consumed by the Web Mission Control live terminal.';
