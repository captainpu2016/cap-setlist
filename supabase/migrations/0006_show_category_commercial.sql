-- 演出分類新增 commercial（顯示名稱「其他」）：企業、球團、頒獎、比賽等不屬於其他類別的商業或活動演出。
-- 註：gig_event 現在的顯示名稱是「場館邀演」（早期叫「商演與活動」），資料值維持不變。
alter table shows drop constraint if exists shows_category_check;
alter table shows add constraint shows_category_check
  check (category is null or category in ('festival', 'own', 'invited', 'gig_event', 'commercial', 'campus'));
