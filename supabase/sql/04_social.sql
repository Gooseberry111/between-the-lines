-- Social features: poet bios, follows, margin notes (comments),
-- notifications, and the "most-loved lines" view.
--
-- Run in Supabase Dashboard -> SQL Editor, after 03_public_reading.sql.
-- Safe to re-run.

-- ---------------------------------------------------------------
-- Poet bios
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists bio text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_length') then
    alter table public.profiles
      add constraint profiles_bio_length check (bio is null or char_length(bio) <= 300);
  end if;
end $$;

-- ---------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "Anyone can see follows" on public.follows;
create policy "Anyone can see follows"
  on public.follows for select to anon, authenticated using (true);

drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------
-- Comments ("notes in the margin") and notifications.
-- poem_id / line_id must match the id types of poems / poem_lines
-- (uuid or bigint), so the tables are created with those types.
-- ---------------------------------------------------------------
do $$
declare
  poem_id_type text;
  line_id_type text;
begin
  select format_type(atttypid, atttypmod) into poem_id_type
  from pg_attribute where attrelid = 'public.poems'::regclass and attname = 'id';

  select format_type(atttypid, atttypmod) into line_id_type
  from pg_attribute where attrelid = 'public.poem_lines'::regclass and attname = 'id';

  execute format(
    'create table if not exists public.comments (
       id uuid primary key default gen_random_uuid(),
       poem_id %1$s not null references public.poems (id) on delete cascade,
       user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
       line_id %2$s references public.poem_lines (id) on delete set null,
       body text not null check (char_length(body) between 1 and 1000),
       created_at timestamptz not null default now()
     )',
    poem_id_type, line_id_type
  );

  execute format(
    'create table if not exists public.notifications (
       id uuid primary key default gen_random_uuid(),
       user_id uuid not null references public.profiles (id) on delete cascade,
       actor_id uuid not null references public.profiles (id) on delete cascade,
       type text not null check (type in (''heart'', ''follow'', ''comment'')),
       poem_id %1$s references public.poems (id) on delete cascade,
       line_id %2$s references public.poem_lines (id) on delete set null,
       read_at timestamptz,
       created_at timestamptz not null default now()
     )',
    poem_id_type, line_id_type
  );
end $$;

create index if not exists comments_poem_idx on public.comments (poem_id, created_at);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Comments: readable on published poems (and by the poem's author)
drop policy if exists "Read comments on visible poems" on public.comments;
create policy "Read comments on visible poems"
  on public.comments for select to anon, authenticated
  using (
    exists (
      select 1 from public.poems p
      where p.id = comments.poem_id
        and (p.status = 'published' or p.author_id = auth.uid())
    )
  );

drop policy if exists "Write comments on published poems" on public.comments;
create policy "Write comments on published poems"
  on public.comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.poems p
      where p.id = comments.poem_id and p.status = 'published'
    )
  );

drop policy if exists "Delete own comments or comments on own poems" on public.comments;
create policy "Delete own comments or comments on own poems"
  on public.comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.poems p
      where p.id = comments.poem_id and p.author_id = auth.uid()
    )
  );

-- Notifications: only the recipient can see / mark read / clear them.
-- They're created by the triggers below, never directly by clients.
drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Mark own notifications read" on public.notifications;
create policy "Mark own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Clear own notifications" on public.notifications;
create policy "Clear own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Notification triggers (security definer: they write on the
-- recipient's behalf, which clients can't do themselves)
-- ---------------------------------------------------------------
create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_poem_id public.poems.id%type;
  v_author uuid;
begin
  select p.id, p.author_id into v_poem_id, v_author
  from public.poem_lines l join public.poems p on p.id = l.poem_id
  where l.id = new.line_id;

  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, poem_id, line_id)
    values (v_author, new.user_id, 'heart', v_poem_id, new.line_id);
  end if;
  return new;
end $$;

drop trigger if exists line_reactions_notify on public.line_reactions;
create trigger line_reactions_notify
  after insert on public.line_reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.followee_id, new.follower_id, 'follow');
  return new;
end $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.poems where id = new.poem_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, poem_id, line_id)
    values (v_author, new.user_id, 'comment', new.poem_id, new.line_id);
  end if;
  return new;
end $$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------
-- Most-loved lines: heart counts per line on published poems.
-- security_invoker makes the view respect the caller's RLS.
-- ---------------------------------------------------------------
create or replace view public.line_heart_counts
with (security_invoker = true) as
select
  l.id as line_id,
  l.content,
  l.poem_id,
  p.title as poem_title,
  p.author_id,
  pr.username,
  count(*)::int as hearts
from public.line_reactions r
join public.poem_lines l on l.id = r.line_id
join public.poems p on p.id = l.poem_id
left join public.profiles pr on pr.id = p.author_id
where p.status = 'published'
group by l.id, l.content, l.poem_id, p.title, p.author_id, pr.username;

grant select on public.line_heart_counts to anon, authenticated;
