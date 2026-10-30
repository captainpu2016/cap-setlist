-- 場次的「售票連結」與「開演時間」
-- 在 Supabase Dashboard → SQL Editor 貼上整份執行一次即可（可重複執行）。
-- 執行之前，後台不會顯示這兩個欄位，前台也不會顯示倒數與購票按鈕。

alter table shows add column if not exists ticket_url text;
alter table shows add column if not exists start_time time;

comment on column shows.ticket_url is '售票頁網址（http/https 開頭）';
comment on column shows.start_time is '開演時間（台灣時間，不含日期）；沒填則行事曆用全天事件';
