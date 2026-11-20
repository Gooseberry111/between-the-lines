-- Draft history: every time a poem's title or text changes, the previous
-- version is kept so the author can look back and restore it.
--
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.

do $$
declare
  poem_id_type text;
begin
  select format_type(atttypid, atttypmod) into poem_id_type
  from pg_attribute where attrelid = 'public.poems'::regclass and attname = 'id';

  execute format(
    'create table if not exists public.poem_versions (
       id uuid primary key default gen_random_uuid(),
       poem_id %s not null references public.poems (id) on delete cascade,
       title text,
       body text,
       category text,
       created_at timestamptz not null default now()
     )',
    poem_id_type
  );
end $$;

create index if not exists poem_versions_poem_idx
  on public.poem_versions (poem_id, created_at desc);

alter table public.poem_versions enable row level security;

drop policy if exists "Authors read their poem history" on public.poem_versions;
create policy "Authors read their poem history"
  on public.poem_versions for select to authenticated
  using (
    exists (
      select 1 from public.poems p
      where p.id = poem_versions.poem_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "Authors delete their poem history" on public.poem_versions;
create policy "Authors delete their poem history"
  on public.poem_versions for delete to authenticated
  using (
    exists (
      select 1 from public.poems p
      where p.id = poem_versions.poem_id and p.author_id = auth.uid()
    )
  );

-- Snapshot the old version before the text or title changes
create or replace function public.snapshot_poem_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.title is distinct from new.title or old.body is distinct from new.body then
    insert into public.poem_versions (poem_id, title, body, category, created_at)
    values (old.id, old.title, old.body, old.category, coalesce(old.updated_at, old.created_at, now()));
  end if;
  return new;
end $$;

drop trigger if exists poems_snapshot_version on public.poems;
create trigger poems_snapshot_version
  before update on public.poems
  for each row execute function public.snapshot_poem_version();
