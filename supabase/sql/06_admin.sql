-- Admin tools: admin accounts, site settings (poem of the day, editor's
-- picks) and reports (moderation).
--
-- Run in Supabase Dashboard -> SQL Editor, after 04_social.sql. Safe to re-run.
--
-- Then make yourself an admin (replace the email with yours):
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');

-- ---------------------------------------------------------------
-- Admin accounts
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Nobody can make themselves an admin through the app. Only an existing
-- admin, or you in the SQL editor, can change it.
create or replace function public.guard_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      raise exception 'Only an admin can change admin status';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_admin on public.profiles;
create trigger profiles_guard_admin
  before insert or update on public.profiles
  for each row execute function public.guard_admin_flag();

-- ---------------------------------------------------------------
-- Site settings (poem of the day, editor's picks)
-- ---------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
  on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------
do $$
declare
  poem_id_type text;
begin
  select format_type(atttypid, atttypmod) into poem_id_type
  from pg_attribute where attrelid = 'public.poems'::regclass and attname = 'id';

  execute format(
    'create table if not exists public.reports (
       id uuid primary key default gen_random_uuid(),
       reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
       target_type text not null check (target_type in (''comment'', ''poem'')),
       comment_id uuid references public.comments (id) on delete cascade,
       poem_id %s references public.poems (id) on delete cascade,
       reason text not null check (char_length(reason) between 1 and 200),
       status text not null default ''open'' check (status in (''open'', ''resolved'', ''dismissed'')),
       created_at timestamptz not null default now(),
       resolved_at timestamptz,
       constraint reports_has_target check (comment_id is not null or poem_id is not null)
     )',
    poem_id_type
  );
end $$;

-- One report per person per thing
create unique index if not exists reports_one_per_comment
  on public.reports (reporter_id, comment_id) where comment_id is not null;
create unique index if not exists reports_one_per_poem
  on public.reports (reporter_id, poem_id) where target_type = 'poem';
create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Signed-in users can report" on public.reports;
create policy "Signed-in users can report"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id and status = 'open');

drop policy if exists "Admins read reports" on public.reports;
create policy "Admins read reports"
  on public.reports for select to authenticated using (public.is_admin());

drop policy if exists "Admins resolve reports" on public.reports;
create policy "Admins resolve reports"
  on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- Moderation powers for admins
-- ---------------------------------------------------------------
drop policy if exists "Admins read all poems" on public.poems;
create policy "Admins read all poems"
  on public.poems for select to authenticated using (public.is_admin());

drop policy if exists "Admins can unpublish poems" on public.poems;
create policy "Admins can unpublish poems"
  on public.poems for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Delete anyone's poem (its lines, hearts, notes etc. go with it)
drop policy if exists "Admins delete any poem" on public.poems;
create policy "Admins delete any poem"
  on public.poems for delete to authenticated using (public.is_admin());

drop policy if exists "Admins read all comments" on public.comments;
create policy "Admins read all comments"
  on public.comments for select to authenticated using (public.is_admin());

drop policy if exists "Admins delete any comment" on public.comments;
create policy "Admins delete any comment"
  on public.comments for delete to authenticated using (public.is_admin());
