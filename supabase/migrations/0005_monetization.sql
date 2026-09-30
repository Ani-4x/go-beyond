-- Persist the free-challenge allowance independently from deletable journal history.
alter table public.profiles
  add column if not exists completed_challenges integer not null default 0
  check (completed_challenges >= 0);

-- Preserve usage for accounts that had already completed challenges before this migration.
update public.profiles p
  set completed_challenges = greatest(
    p.completed_challenges,
    (select count(*)::integer from public.entries e where e.user_id = p.id and e.type = 'challenge')
  );

-- Challenge usage is an account-level lifetime counter. Resetting profile progress or
-- deleting journal entries must never restore the free allowance.
create or replace function public.keep_completed_challenges_monotonic()
returns trigger language plpgsql as $$
begin
  new.completed_challenges := greatest(old.completed_challenges, new.completed_challenges);
  return new;
end;
$$;

drop trigger if exists profiles_keep_completed_challenges_monotonic on public.profiles;
create trigger profiles_keep_completed_challenges_monotonic
  before update of completed_challenges on public.profiles
  for each row execute function public.keep_completed_challenges_monotonic();

-- Increment the allowance counter in the same transaction as each journal insert.
create or replace function public.count_completed_challenge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'challenge' then
    update public.profiles
      set completed_challenges = completed_challenges + 1
      where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists entries_count_completed_challenge on public.entries;
create trigger entries_count_completed_challenge
  after insert on public.entries
  for each row execute function public.count_completed_challenge();
