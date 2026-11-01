-- 演出分類（單選）與系列（選填）
-- category：festival 音樂祭｜own 普隊企劃｜invited 受邀演出｜campus 校園｜gig_event 商演與活動
alter table shows add column if not exists category text
  check (category is null or category in ('festival', 'own', 'invited', 'campus', 'gig_event'));
alter table shows add column if not exists series text;

comment on column shows.category is '演出分類：festival / own / invited / campus / gig_event';
comment on column shows.series is '系列名稱，例如「Tiny Me, BIG Dream Tour」「諸羅搖滾」';
