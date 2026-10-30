-- 場次留言功能
-- 在 Supabase Dashboard → SQL Editor 貼上整份執行一次即可（可重複執行）。
-- 執行之前網站不會顯示留言區；執行之後留言區會自動出現。

create table if not exists show_comments (
  id            uuid primary key default gen_random_uuid(),
  show_id       uuid not null references shows(id) on delete cascade,
  nickname      text not null default '匿名歌迷' check (char_length(nickname) <= 20),
  body          text not null check (char_length(body) between 1 and 200),
  -- 裝置代碼經過雜湊後才存，避免公開讀取留言時洩漏可對應到「我的紀錄」的原始代碼
  device_hash   text not null,
  status        text not null default 'visible' check (status in ('visible', 'hidden')),
  report_count  int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_show_comments_show_created
  on show_comments (show_id, created_at desc);
create index if not exists idx_show_comments_device_created
  on show_comments (device_hash, created_at desc);

-- 檢舉紀錄：同一個裝置對同一則留言只能檢舉一次
create table if not exists show_comment_reports (
  comment_id   uuid not null references show_comments(id) on delete cascade,
  device_hash  text not null,
  created_at   timestamptz not null default now(),
  primary key (comment_id, device_hash)
);

alter table show_comments enable row level security;
alter table show_comment_reports enable row level security;

-- 訪客只能讀「顯示中」且所屬場次已發布的留言；寫入一律走後端 API（service role）
drop policy if exists "show_comments_public_read" on show_comments;
create policy "show_comments_public_read" on show_comments
  for select using (
    status = 'visible'
    and exists (select 1 from shows s where s.id = show_comments.show_id and s.status = 'published')
  );

-- 後台管理者（已登入）可讀寫全部，用來隱藏／恢復／刪除
drop policy if exists "show_comments_auth_all" on show_comments;
create policy "show_comments_auth_all" on show_comments
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 檢舉紀錄不開放給 anon，只有後端 service role 可存取（不建立任何 policy）
