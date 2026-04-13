-- Sync Studio: persistent scenes and saved scene-to-track matches in core platform

create table if not exists public.studio_scenes (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_scenes_supervisor_created
  on public.studio_scenes (supervisor_id, created_at desc);

create table if not exists public.studio_matches (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  scene_id uuid references public.studio_scenes(id) on delete set null,
  track_id uuid not null references public.tracks(id) on delete cascade,
  note text,
  clip_volume integer not null default 70 check (clip_volume between 0 and 100),
  music_volume integer not null default 80 check (music_volume between 0 and 100),
  music_offset_seconds integer not null default 0 check (music_offset_seconds between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_matches_supervisor_created
  on public.studio_matches (supervisor_id, created_at desc);

create index if not exists idx_studio_matches_track
  on public.studio_matches (track_id);

create unique index if not exists idx_studio_matches_unique_pairing
  on public.studio_matches (supervisor_id, scene_id, track_id);

alter table public.studio_scenes enable row level security;
alter table public.studio_matches enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_scenes'
      and policyname = 'studio_scenes_owner_select'
  ) then
    create policy studio_scenes_owner_select
      on public.studio_scenes
      for select
      using (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_scenes'
      and policyname = 'studio_scenes_owner_insert'
  ) then
    create policy studio_scenes_owner_insert
      on public.studio_scenes
      for insert
      with check (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_scenes'
      and policyname = 'studio_scenes_owner_update'
  ) then
    create policy studio_scenes_owner_update
      on public.studio_scenes
      for update
      using (auth.uid() = supervisor_id)
      with check (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_scenes'
      and policyname = 'studio_scenes_owner_delete'
  ) then
    create policy studio_scenes_owner_delete
      on public.studio_scenes
      for delete
      using (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_matches'
      and policyname = 'studio_matches_owner_select'
  ) then
    create policy studio_matches_owner_select
      on public.studio_matches
      for select
      using (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_matches'
      and policyname = 'studio_matches_owner_insert'
  ) then
    create policy studio_matches_owner_insert
      on public.studio_matches
      for insert
      with check (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_matches'
      and policyname = 'studio_matches_owner_update'
  ) then
    create policy studio_matches_owner_update
      on public.studio_matches
      for update
      using (auth.uid() = supervisor_id)
      with check (auth.uid() = supervisor_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_matches'
      and policyname = 'studio_matches_owner_delete'
  ) then
    create policy studio_matches_owner_delete
      on public.studio_matches
      for delete
      using (auth.uid() = supervisor_id);
  end if;
end $$;

drop trigger if exists studio_scenes_set_updated_at on public.studio_scenes;
create trigger studio_scenes_set_updated_at
before update on public.studio_scenes
for each row execute function public.handle_updated_at();

drop trigger if exists studio_matches_set_updated_at on public.studio_matches;
create trigger studio_matches_set_updated_at
before update on public.studio_matches
for each row execute function public.handle_updated_at();
