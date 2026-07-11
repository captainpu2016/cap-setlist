-- 普通隊長歌單管理系統 — 初始 schema
-- 在 Supabase Dashboard 的 SQL Editor 貼上整份執行，或用 supabase CLI 跑 migration

-- 需要 uuid 產生函式
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. songs（歌曲主檔）
-- ---------------------------------------------------------------------
create table if not exists songs (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  artist            text not null default '普通隊長',
  duration_seconds  int,
  spotify_track_id  text,
  apple_music_url   text,
  youtube_url       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column songs.spotify_track_id is '純 track ID，不存完整網址';
comment on column songs.apple_music_url is '完整網址（連結制，非 API ID）';

-- ---------------------------------------------------------------------
-- 2. shows（場次）
-- ---------------------------------------------------------------------
do $$ begin
  create type show_status as enum ('draft', 'published');
exception
  when duplicate_object then null;
end $$;

create table if not exists shows (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  title                  text not null,
  show_date              date not null,
  venue                  text,
  status                 show_status not null default 'draft',
  spotify_playlist_url   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. setlist_items（歌單關聯表）
-- ---------------------------------------------------------------------
create table if not exists setlist_items (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references shows(id) on delete cascade,
  song_id         uuid references songs(id) on delete set null,
  position        int not null,
  notes           text,
  is_placeholder  boolean not null default false,
  created_at      timestamptz not null default now()
);

-- is_placeholder = true 時允許 song_id 為 null（尚未選定曲目）
alter table setlist_items
  add constraint setlist_items_song_or_placeholder
  check (is_placeholder = true or song_id is not null);

-- ---------------------------------------------------------------------
-- 4. app_settings（系統設定，僅後端讀取）
-- ---------------------------------------------------------------------
create table if not exists app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. 索引
-- ---------------------------------------------------------------------
create index if not exists idx_setlist_items_show_position
  on setlist_items (show_id, position);

create index if not exists idx_shows_status_date
  on shows (status, show_date desc);

create index if not exists idx_songs_title
  on songs (title);

-- ---------------------------------------------------------------------
-- 6. updated_at 自動更新 trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_songs_updated_at on songs;
create trigger trg_songs_updated_at
  before update on songs
  for each row execute function set_updated_at();

drop trigger if exists trg_shows_updated_at on shows;
create trigger trg_shows_updated_at
  before update on shows
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
alter table songs enable row level security;
alter table shows enable row level security;
alter table setlist_items enable row level security;
alter table app_settings enable row level security;

-- songs：公開可讀，寫入僅限已登入使用者（後台管理者）
drop policy if exists "songs_public_read" on songs;
create policy "songs_public_read" on songs
  for select using (true);

drop policy if exists "songs_auth_write" on songs;
create policy "songs_auth_write" on songs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- shows：前台只能讀 published 場次；已登入者可讀寫全部（含 draft）
drop policy if exists "shows_public_read_published" on shows;
create policy "shows_public_read_published" on shows
  for select using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "shows_auth_write" on shows;
create policy "shows_auth_write" on shows
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "shows_auth_update" on shows;
create policy "shows_auth_update" on shows
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "shows_auth_delete" on shows;
create policy "shows_auth_delete" on shows
  for delete using (auth.role() = 'authenticated');

-- setlist_items：只能讀取「所屬場次為 published」或使用者已登入
drop policy if exists "setlist_items_public_read" on setlist_items;
create policy "setlist_items_public_read" on setlist_items
  for select using (
    auth.role() = 'authenticated'
    or exists (
      select 1 from shows s
      where s.id = setlist_items.show_id and s.status = 'published'
    )
  );

drop policy if exists "setlist_items_auth_write" on setlist_items;
create policy "setlist_items_auth_write" on setlist_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- app_settings：完全不開放 anon，anon 與 authenticated 皆不可存取，
-- 只有使用 service role key 的後端（bypass RLS）可讀寫
drop policy if exists "app_settings_no_access" on app_settings;
create policy "app_settings_no_access" on app_settings
  for all using (false) with check (false);

-- ---------------------------------------------------------------------
-- 8. 初始設定值（selectively，避免 API route 找不到 key 時出錯）
-- ---------------------------------------------------------------------
insert into app_settings (key, value)
values ('spotify_refresh_token', null)
on conflict (key) do nothing;
