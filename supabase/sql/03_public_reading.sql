-- Let anyone (signed in or not) read published work.
--
-- These policies only ADD read access; they don't remove any existing
-- policy, and they don't switch RLS on for tables where it's off.
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.

-- Published poems
drop policy if exists "Anyone can read published poems" on public.poems;
create policy "Anyone can read published poems"
  on public.poems for select
  to anon, authenticated
  using (status = 'published');

-- Lines of published poems
drop policy if exists "Anyone can read lines of published poems" on public.poem_lines;
create policy "Anyone can read lines of published poems"
  on public.poem_lines for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.poems p
      where p.id = poem_lines.poem_id and p.status = 'published'
    )
  );

-- Heart counts on published lines
drop policy if exists "Anyone can read reactions on published poems" on public.line_reactions;
create policy "Anyone can read reactions on published poems"
  on public.line_reactions for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.poem_lines l
      join public.poems p on p.id = l.poem_id
      where l.id = line_reactions.line_id and p.status = 'published'
    )
  );

-- Poet names
drop policy if exists "Anyone can read profiles" on public.profiles;
create policy "Anyone can read profiles"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Instrumental titles shown on poems
drop policy if exists "Anyone can read instrumentals" on public.instrumentals;
create policy "Anyone can read instrumentals"
  on public.instrumentals for select
  to anon, authenticated
  using (true);

-- Collections are shareable by link
drop policy if exists "Anyone can read collections" on public.collections;
create policy "Anyone can read collections"
  on public.collections for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can read collection contents" on public.collection_poems;
create policy "Anyone can read collection contents"
  on public.collection_poems for select
  to anon, authenticated
  using (true);
