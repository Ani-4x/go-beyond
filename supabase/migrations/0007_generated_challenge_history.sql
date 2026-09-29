-- Keep the exact actions that were offered, including challenges that were never completed.
-- This history survives progress resets and disappears when the account is deleted.
create table if not exists public.generated_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_challenges_user_created_idx
  on public.generated_challenges (user_id, created_at desc);

alter table public.generated_challenges enable row level security;

create policy "generated challenges: read own" on public.generated_challenges
  for select using (auth.uid() = user_id);

create policy "generated challenges: insert own" on public.generated_challenges
  for insert with check (auth.uid() = user_id);

-- Serialize reservations for one user so parallel daily requests cannot return the same idea.
-- The embedding comparison rejects close paraphrases as well as identical text.
create or replace function public.reserve_generated_challenge(
  challenge_text text,
  challenge_embedding vector(768)
)
returns boolean
language plpgsql
security invoker
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or length(trim(challenge_text)) < 10 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  if exists (
    select 1 from public.generated_challenges
    where user_id = current_user_id
      and (
        lower(regexp_replace(text, '[^[:alnum:]]+', '', 'g')) =
          lower(regexp_replace(challenge_text, '[^[:alnum:]]+', '', 'g'))
        or 1 - (embedding <=> challenge_embedding) >= 0.78
      )
  ) then
    return false;
  end if;

  insert into public.generated_challenges (user_id, text, embedding)
  values (current_user_id, trim(challenge_text), challenge_embedding);
  return true;
end;
$$;
