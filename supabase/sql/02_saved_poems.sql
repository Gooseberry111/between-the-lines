-- Saved / bookmarked poems.
--
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- poem_id must match the type of poems.id (uuid or bigint), so read it
do $$
declare
  poem_id_type text;
begin
  select format_type(atttypid, atttypmod) into poem_id_type
  from pg_attribute
  where attrelid = 'public.poems'::regclass and attname = 'id';

  execute format(
    'create table if not exists public.saved_poems (
       user_id uuid not null references auth.users (id) on delete cascade,
       poem_id %s not null references public.poems (id) on delete cascade,
       created_at timestamptz not null default now(),
       primary key (user_id, poem_id)
     )',
    poem_id_type
  );
end $$;

create index if not exists saved_poems_poem_id_idx on public.saved_poems (poem_id);

alter table public.saved_poems enable row level security;

drop policy if exists "Users can see their saved poems" on public.saved_poems;
create policy "Users can see their saved poems"
  on public.saved_poems for select
  using (auth.uid() = user_id);

drop policy if exists "Users can save poems" on public.saved_poems;
create policy "Users can save poems"
  on public.saved_poems for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unsave poems" on public.saved_poems;
create policy "Users can unsave poems"
  on public.saved_poems for delete
  using (auth.uid() = user_id);
