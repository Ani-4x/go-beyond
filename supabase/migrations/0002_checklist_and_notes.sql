-- Follow-up to 0001_init.sql: the daily challenge became a 3-item checklist, and journal
-- entries gained an optional note. Run this once against a project that already has
-- 0001_init.sql applied.

-- `profiles.today` is jsonb, so no column change is needed for the new shape — it now holds
-- { date, items: [{ id, dim, level, done }, ...] } instead of a single challenge object. The
-- app treats any row with an unrecognized shape (no `items` array) as if today's checklist
-- hadn't been generated yet, and regenerates it, so no backfill is required.

alter table public.entries add column if not exists note text;
