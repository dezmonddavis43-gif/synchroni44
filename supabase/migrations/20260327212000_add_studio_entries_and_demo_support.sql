-- Studio entries, media storage support, and catalog track attachments

create table if not exists public.studio_entries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  video_mode text check (video_mode in ('upload', 'url')),
  video_url text,
  video_file_path text,
  video_file_name text,
  video_file_size bigint,
  video_mime_type text,
  audio_file_path text,
  audio_url text,
  audio_file_name text,
  audio_file_size bigint,
  audio_mime_type text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  tags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_entries_created_by_created_at
  on public.studio_entries (created_by, created_at desc);

create table if not exists public.studio_entry_tracks (
  id uuid primary key default gen_random_uuid(),
  studio_entry_id uuid not null references public.studio_entries(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (studio_entry_id, track_id)
);

create index if not exists idx_studio_entry_tracks_entry_position
  on public.studio_entry_tracks (studio_entry_id, position);

alter table public.studio_entries add column if not exists audio_url text;

alter table public.studio_entries enable row level security;
alter table public.studio_entry_tracks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entries' and policyname = 'studio_entries_owner_select'
  ) then
    create policy studio_entries_owner_select
      on public.studio_entries for select
      using (auth.uid() = created_by);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entries' and policyname = 'studio_entries_owner_insert'
  ) then
    create policy studio_entries_owner_insert
      on public.studio_entries for insert
      with check (auth.uid() = created_by);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entries' and policyname = 'studio_entries_owner_update'
  ) then
    create policy studio_entries_owner_update
      on public.studio_entries for update
      using (auth.uid() = created_by)
      with check (auth.uid() = created_by);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entries' and policyname = 'studio_entries_owner_delete'
  ) then
    create policy studio_entries_owner_delete
      on public.studio_entries for delete
      using (auth.uid() = created_by);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entry_tracks' and policyname = 'studio_entry_tracks_owner_select'
  ) then
    create policy studio_entry_tracks_owner_select
      on public.studio_entry_tracks for select
      using (
        exists (
          select 1 from public.studio_entries se
          where se.id = studio_entry_tracks.studio_entry_id
            and se.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entry_tracks' and policyname = 'studio_entry_tracks_owner_insert'
  ) then
    create policy studio_entry_tracks_owner_insert
      on public.studio_entry_tracks for insert
      with check (
        exists (
          select 1 from public.studio_entries se
          where se.id = studio_entry_tracks.studio_entry_id
            and se.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'studio_entry_tracks' and policyname = 'studio_entry_tracks_owner_delete'
  ) then
    create policy studio_entry_tracks_owner_delete
      on public.studio_entry_tracks for delete
      using (
        exists (
          select 1 from public.studio_entries se
          where se.id = studio_entry_tracks.studio_entry_id
            and se.created_by = auth.uid()
        )
      );
  end if;
end $$;

drop trigger if exists studio_entries_set_updated_at on public.studio_entries;
create trigger studio_entries_set_updated_at
before update on public.studio_entries
for each row execute function public.handle_updated_at();

insert into storage.buckets (id, name, public)
values ('studio', 'studio', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Studio uploads are owner-scoped'
  ) then
    create policy "Studio uploads are owner-scoped"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'studio'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Studio assets are publicly readable'
  ) then
    create policy "Studio assets are publicly readable"
      on storage.objects for select
      to public
      using (bucket_id = 'studio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Studio owners can delete own uploads'
  ) then
    create policy "Studio owners can delete own uploads"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'studio'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;
