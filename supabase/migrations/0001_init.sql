-- Go Beyond: schema, security, and the trigger that provisions a profile at sign-up.
-- Run this once in the Supabase SQL Editor for your project (or via `supabase db push`
-- if you're using the Supabase CLI).

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles: one row per user. The zone, XP, streak, and today's challenge —
-- everything except the journal entries themselves.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  zone           jsonb not null default '[0.3,0.3,0.3,0.3,0.3,0.3]'::jsonb,
  xp             integer not null default 0,
  streak         integer not null default 0,
  last_completed date,
  -- { date, dim, level, shrunk, done } — see src/state/store.tsx's TodayChallenge type.
  today          jsonb,
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Normally the trigger below creates this row. The app also has a client-side fallback
-- for the rare case where it reads the row a beat before the trigger has run.
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- entries: the journal. Completed challenges and free-form moments, in one table.
-- Moments never carry XP — that's enforced in the app, not here, since it's a
-- product rule rather than a data-integrity one.
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('challenge', 'moment')),
  title      text not null,
  tag        text not null,
  feel       text,
  created_at timestamptz not null default now()
);

create index if not exists entries_user_created_idx on public.entries (user_id, created_at desc);

alter table public.entries enable row level security;

create policy "entries: read own" on public.entries
  for select using (auth.uid() = user_id);
create policy "entries: insert own" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "entries: delete own" on public.entries
  for delete using (auth.uid() = user_id);
-- No update policy: entries are logged once and never edited in place.

-- ---------------------------------------------------------------------------
-- Auto-create a profile row the moment someone signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
