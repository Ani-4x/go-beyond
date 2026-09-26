-- Adds vector search over the journal, so challenge generation can look at what someone has
-- actually done before suggesting something new. Uses Google's gemini-embedding-001 at 768
-- dimensions (Google's recommended size — see supabase/functions/_shared/gemini.ts).

create extension if not exists vector;

alter table public.entries add column if not exists embedding vector(768);

-- A basic index is skipped for now: ivfflat/hnsw indexes pay off once a user has many
-- hundreds of entries, and a per-user sequential scan is trivial at this app's scale. If a
-- single user's journal grows very large, add one then (e.g.
-- `create index on entries using hnsw (embedding vector_cosine_ops)`).

-- Finds this user's past entries whose embedding is closest to a query embedding
-- (cosine distance). Runs as the calling user (default: security invoker), so `auth.uid()`
-- is trustworthy here and RLS on `entries` applies on top of it regardless.
create or replace function public.match_entries(
  query_embedding vector(768),
  match_count int default 6
)
returns table (
  id uuid,
  title text,
  tag text,
  feel text,
  note text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    id, title, tag, feel, note, created_at,
    1 - (embedding <=> query_embedding) as similarity
  from public.entries
  where user_id = auth.uid() and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
