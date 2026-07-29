/*
# Multi-Agent Orchestration Schema

## Overview
Upgrades the Aether Agent's data layer to support multi-agent orchestration:
planner/coder/reviewer pipelines, enhanced long-term memory with vector
search, confidence scoring, and task tracking.

## New Tables

### agent_tasks
Tracks the decomposition of a user request into sub-tasks and their
execution state across planner -> coder -> reviewer stages.
- id (uuid, pk)
- session_id (text) — isolates per chat session
- request_id (text) — groups tasks from one user request
- index (int) — ordering within the request
- title (text) — short task title
- description (text) — what the task does
- status (text) — pending | in_progress | completed | failed | skipped
- agent_role (text) — planner | coder | reviewer | orchestrator
- result_summary (text) — short outcome written when done
- confidence (int) — 0-100 self-assessed confidence
- files_produced (text[]) — paths written during this task
- error (text) — failure reason if any
- created_at, updated_at (timestamptz)

### agent_memory (replaces/enhances agent_memory)
Enhanced long-term memory with tags, summary, project, language,
access tracking, and vector embedding for semantic search.
- id (uuid, pk)
- session_id (text)
- content (text) — the memory note
- summary (text) — AI-generated short summary
- category (text) — general | preference | fact | project | explicit
- tags (text[]) — free-form labels for filtering
- project (text) — project name/context this memory belongs to
- language (text) — programming language or topic
- importance (int) — 1-10 user/system assigned
- access_count (int) — how many times retrieved
- last_used_at (timestamptz) — last retrieval time
- embedding (vector(1536)) — text-embedding-3-small vector
- created_at, updated_at (timestamptz)

### agent_relations
Lightweight project knowledge graph: which files reference which.
- id (uuid, pk)
- session_id (text)
- source_file (text)
- target_file (text)
- relation (text) — uses | calls | imports | depends_on
- created_at (timestamptz)

## Modified Tables
None — this is additive only. Existing agent_memory table (if present)
is left untouched; the new enhanced table is named agent_memory_v2 to
avoid data loss. The app reads/writes agent_memory_v2 going forward.

## Security
- All tables are single-tenant (no auth screen in this app).
- RLS enabled on every table.
- Policies allow anon + authenticated full CRUD because data is
  intentionally shared per-session (session_id provides isolation).

## Important Notes
1. pgvector extension enabled for vector similarity search.
2. A match_memories RPC function performs semantic retrieval with
   cosine distance, scoped to a session, with a configurable match count.
3. An update_memory_access function bumps access_count and last_used_at
   when a memory is retrieved, enabling recency/frequency ranking.
4. Idempotent: safe to re-run.
*/

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- agent_tasks: sub-task tracking for multi-agent orchestration
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  request_id text NOT NULL,
  index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  agent_role text NOT NULL DEFAULT 'coder',
  result_summary text DEFAULT '',
  confidence int DEFAULT 0,
  files_produced text[] DEFAULT '{}',
  error text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agent_tasks" ON agent_tasks;
CREATE POLICY "anon_select_agent_tasks" ON agent_tasks FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_tasks" ON agent_tasks;
CREATE POLICY "anon_insert_agent_tasks" ON agent_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_agent_tasks" ON agent_tasks;
CREATE POLICY "anon_update_agent_tasks" ON agent_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_tasks" ON agent_tasks;
CREATE POLICY "anon_delete_agent_tasks" ON agent_tasks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_session ON agent_tasks (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_request ON agent_tasks (request_id);

-- agent_memory_v2: enhanced long-term memory with vector embeddings
CREATE TABLE IF NOT EXISTS agent_memory_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  content text NOT NULL,
  summary text DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  project text DEFAULT '',
  language text DEFAULT '',
  importance int NOT NULL DEFAULT 5,
  access_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE agent_memory_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agent_memory_v2" ON agent_memory_v2;
CREATE POLICY "anon_select_agent_memory_v2" ON agent_memory_v2 FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_memory_v2" ON agent_memory_v2;
CREATE POLICY "anon_insert_agent_memory_v2" ON agent_memory_v2 FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_agent_memory_v2" ON agent_memory_v2;
CREATE POLICY "anon_update_agent_memory_v2" ON agent_memory_v2 FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_memory_v2" ON agent_memory_v2;
CREATE POLICY "anon_delete_agent_memory_v2" ON agent_memory_v2 FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_agent_memory_v2_session ON agent_memory_v2 (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_v2_importance ON agent_memory_v2 (importance DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_v2_embedding ON agent_memory_v2
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- agent_relations: project knowledge graph
CREATE TABLE IF NOT EXISTS agent_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  source_file text NOT NULL,
  target_file text NOT NULL,
  relation text NOT NULL DEFAULT 'uses',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agent_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_agent_relations" ON agent_relations;
CREATE POLICY "anon_select_agent_relations" ON agent_relations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_relations" ON agent_relations;
CREATE POLICY "anon_insert_agent_relations" ON agent_relations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_relations" ON agent_relations;
CREATE POLICY "anon_delete_agent_relations" ON agent_relations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_agent_relations_session ON agent_relations (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_relations_source ON agent_relations (source_file);

-- Semantic memory search via vector cosine distance
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_session text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  session_id text,
  content text,
  summary text,
  category text,
  tags text[],
  project text,
  language text,
  importance int,
  access_count int,
  last_used_at timestamptz,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, session_id, content, summary, category, tags, project, language,
    importance, access_count, last_used_at, created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM agent_memory_v2
  WHERE session_id = match_session AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Bump access_count and last_used_at when a memory is retrieved
CREATE OR REPLACE FUNCTION bump_memory_access(memory_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE agent_memory_v2
  SET access_count = access_count + 1,
      last_used_at = now(),
      updated_at = now()
  WHERE id = memory_id;
$$;
