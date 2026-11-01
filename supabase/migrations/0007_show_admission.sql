-- 入場方式：paid 付費｜free 免費（選填，主要用在音樂祭/節，也可用在其他演出）
alter table shows add column if not exists admission text
  check (admission is null or admission in ('paid', 'free'));
comment on column shows.admission is '入場方式：paid 付費 / free 免費';
