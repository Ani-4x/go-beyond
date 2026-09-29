-- Push Me is available once per account calendar day. Retain the date across profile resets.
alter table public.profiles
  add column if not exists last_push_me_date date;

create or replace function public.keep_last_push_me_date_monotonic()
returns trigger language plpgsql as $$
begin
  new.last_push_me_date := greatest(old.last_push_me_date, new.last_push_me_date);
  return new;
end;
$$;

drop trigger if exists profiles_keep_last_push_me_date_monotonic on public.profiles;
create trigger profiles_keep_last_push_me_date_monotonic
  before update of last_push_me_date on public.profiles
  for each row execute function public.keep_last_push_me_date_monotonic();
