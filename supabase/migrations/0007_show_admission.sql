-- 入場方式：paid 付費｜free 免費（選填，每場演出都可以填；0008 再加上 private 無對外開放）
alter table shows add column if not exists admission text
  check (admission is null or admission in ('paid', 'free'));
comment on column shows.admission is '入場方式：paid 付費 / free 免費';
