-- 入場方式新增 private（無對外開放），例如企業尾牙、校園內部活動
alter table shows drop constraint if exists shows_admission_check;
alter table shows add constraint shows_admission_check
  check (admission is null or admission in ('paid', 'free', 'private'));
