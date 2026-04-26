-- Study Buddy — Max-tier voice companion
-- Adds buddy_profiles, buddy_sessions, buddy_memory, buddy_notes.

-- ── buddy_profiles ──────────────────────────────────────────────
create table if not exists public.buddy_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pronouns text,
  avatar_style jsonb default '{}'::jsonb,
  voice_id text default 'warm-mid',
  personality jsonb default '{}'::jsonb,
  interests text[] default '{}',
  field_affinities text[] default '{}',
  study_style text,
  relationship_mode text default 'new_friend',
  session_count int default 0,
  total_minutes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- One active profile per user (MVP)
create unique index if not exists buddy_profiles_one_per_user
  on public.buddy_profiles (user_id)
  where deleted_at is null;

create index if not exists buddy_profiles_user_idx
  on public.buddy_profiles (user_id);

-- ── buddy_sessions ──────────────────────────────────────────────
create table if not exists public.buddy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buddy_profile_id uuid references public.buddy_profiles(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,
  mode text default 'freeform',
  document_id uuid,
  summary jsonb,
  turn_count int default 0,
  created_at timestamptz default now()
);

create index if not exists buddy_sessions_user_idx
  on public.buddy_sessions (user_id, started_at desc);

create index if not exists buddy_sessions_profile_idx
  on public.buddy_sessions (buddy_profile_id);

-- ── buddy_memory ────────────────────────────────────────────────
-- Uses 768-dim embedding to match existing RAG dimension (text-embedding-004).
create table if not exists public.buddy_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buddy_profile_id uuid not null references public.buddy_profiles(id) on delete cascade,
  kind text not null check (kind in ('fact','preference','struggle','inside_joke','goal','win')),
  content text not null,
  importance int default 1 check (importance between 1 and 5),
  source_session_id uuid references public.buddy_sessions(id) on delete set null,
  embedding vector(768),
  created_at timestamptz default now(),
  last_accessed_at timestamptz
);

create index if not exists buddy_memory_user_idx
  on public.buddy_memory (user_id, buddy_profile_id);

-- Vector index for semantic recall
create index if not exists buddy_memory_embedding_idx
  on public.buddy_memory using hnsw (embedding vector_cosine_ops);

-- ── buddy_notes (sticky notes from a single session) ────────────
create table if not exists public.buddy_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.buddy_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  tag text,
  at_offset_seconds int,
  created_at timestamptz default now()
);

create index if not exists buddy_notes_session_idx
  on public.buddy_notes (session_id);

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.buddy_profiles enable row level security;
alter table public.buddy_sessions enable row level security;
alter table public.buddy_memory enable row level security;
alter table public.buddy_notes enable row level security;

-- Users can CRUD their own buddy data only.
drop policy if exists buddy_profiles_owner on public.buddy_profiles;
create policy buddy_profiles_owner on public.buddy_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists buddy_sessions_owner on public.buddy_sessions;
create policy buddy_sessions_owner on public.buddy_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists buddy_memory_owner on public.buddy_memory;
create policy buddy_memory_owner on public.buddy_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists buddy_notes_owner on public.buddy_notes;
create policy buddy_notes_owner on public.buddy_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Semantic recall RPC ─────────────────────────────────────────
-- Returns top-K memories for a buddy profile ordered by
--   similarity(query, embedding) * log(1 + importance) * recency_boost
create or replace function public.match_buddy_memory(
  p_user_id uuid,
  p_profile_id uuid,
  p_query_embedding vector(768),
  p_limit int default 12,
  p_similarity_threshold float default 0.55
) returns table (
  id uuid,
  kind text,
  content text,
  importance int,
  similarity float,
  created_at timestamptz
)
language sql
stable
as $$
  select
    m.id,
    m.kind,
    m.content,
    m.importance,
    1 - (m.embedding <=> p_query_embedding) as similarity,
    m.created_at
  from public.buddy_memory m
  where m.user_id = p_user_id
    and m.buddy_profile_id = p_profile_id
    and m.embedding is not null
    and 1 - (m.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by
    (1 - (m.embedding <=> p_query_embedding))
      * ln(1 + m.importance)
      * exp(- extract(epoch from (now() - m.created_at)) / (60 * 60 * 24 * 30))
      desc
  limit p_limit;
$$;

-- ── Increment helper (called at session end) ───────────────────
create or replace function public.bump_buddy_profile_stats(
  p_profile_id uuid,
  p_duration_seconds int
) returns void
language sql
as $$
  update public.buddy_profiles
     set session_count = session_count + 1,
         total_minutes = total_minutes + coalesce(p_duration_seconds, 0) / 60,
         updated_at = now()
   where id = p_profile_id;
$$;
