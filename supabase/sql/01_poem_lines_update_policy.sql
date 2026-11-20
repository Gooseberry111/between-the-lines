-- Lets authors update the lines of their own poems.
--
-- Editing a poem updates poem_lines in place so line reactions (hearts)
-- survive the edit. Without this policy, RLS silently blocks those updates
-- and the app falls back to delete + re-insert, which clears reactions.
--
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

drop policy if exists "Authors can update their poem lines" on public.poem_lines;

create policy "Authors can update their poem lines"
  on public.poem_lines
  for update
  using (
    exists (
      select 1 from public.poems
      where poems.id = poem_lines.poem_id
        and poems.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.poems
      where poems.id = poem_lines.poem_id
        and poems.author_id = auth.uid()
    )
  );
