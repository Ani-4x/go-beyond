-- Adds an editable display name, set from the Profile tab. Falls back to the email's local
-- part in the app when this is null, so no backfill is needed for existing rows.

alter table public.profiles add column if not exists name text;
