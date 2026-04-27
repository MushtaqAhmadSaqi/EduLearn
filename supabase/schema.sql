
-- ============================================
-- EduLearn Supabase Schema
-- Optional cloud backend
-- Run this in Supabase SQL Editor.
-- ============================================

create extension if not exists "pgcrypto";

-- ===== VIDEOS =====

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_id text not null,
  url text,
  title text not null,
  description text default '',
  tags text[] default '{}',
  progress numeric default 0 check (progress >= 0 and progress <= 100),
  watch_time numeric default 0 check (watch_time >= 0),
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_youtube_id_idx on public.videos(youtube_id);

-- ===== PLAYLISTS =====

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  video_ids uuid[] default '{}',
  share_token text unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists playlists_user_id_idx on public.playlists(user_id);
create index if not exists playlists_share_token_idx on public.playlists(share_token);

-- ===== NOTES =====

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  timestamp_sec numeric not null default 0 check (timestamp_sec >= 0),
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists notes_user_video_idx on public.notes(user_id, video_id);
create index if not exists notes_timestamp_idx on public.notes(timestamp_sec);

-- ===== GOALS =====

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target integer not null default 1 check (target > 0),
  metric text not null default 'completed_videos',
  deadline date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists goals_user_id_idx on public.goals(user_id);

-- ===== ACTIVITY =====

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  label text default '',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists activity_user_id_idx on public.activity(user_id);
create index if not exists activity_created_at_idx on public.activity(created_at desc);

-- ===== UPDATED_AT TRIGGER =====

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_videos_updated_at on public.videos;
create trigger set_videos_updated_at
before update on public.videos
for each row
execute function public.set_updated_at();

drop trigger if exists set_playlists_updated_at on public.playlists;
create trigger set_playlists_updated_at
before update on public.playlists
for each row
execute function public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

-- ===== ROW LEVEL SECURITY =====

alter table public.videos enable row level security;
alter table public.playlists enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.activity enable row level security;

-- VIDEOS POLICIES

drop policy if exists "Users can read own videos" on public.videos;
create policy "Users can read own videos"
on public.videos
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own videos" on public.videos;
create policy "Users can insert own videos"
on public.videos
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own videos" on public.videos;
create policy "Users can update own videos"
on public.videos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own videos" on public.videos;
create policy "Users can delete own videos"
on public.videos
for delete
to authenticated
using (auth.uid() = user_id);

-- PLAYLIST POLICIES

drop policy if exists "Users can read own playlists" on public.playlists;
create policy "Users can read own playlists"
on public.playlists
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own playlists" on public.playlists;
create policy "Users can insert own playlists"
on public.playlists
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own playlists" on public.playlists;
create policy "Users can update own playlists"
on public.playlists
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own playlists" on public.playlists;
create policy "Users can delete own playlists"
on public.playlists
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can read shared playlists by token" on public.playlists;
create policy "Anyone can read shared playlists by token"
on public.playlists
for select
to anon, authenticated
using (share_token is not null);

-- NOTES POLICIES

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);

-- GOALS POLICIES

drop policy if exists "Users can read own goals" on public.goals;
create policy "Users can read own goals"
on public.goals
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
on public.goals
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
on public.goals
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
on public.goals
for delete
to authenticated
using (auth.uid() = user_id);

-- ACTIVITY POLICIES

drop policy if exists "Users can read own activity" on public.activity;
create policy "Users can read own activity"
on public.activity
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity" on public.activity;
create policy "Users can insert own activity"
on public.activity
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activity" on public.activity;
create policy "Users can delete own activity"
on public.activity
for delete
to authenticated
using (auth.uid() = user_id);
