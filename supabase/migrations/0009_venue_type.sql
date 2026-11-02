-- 場地類型：livehouse（Live house）｜other（其他：球場、廣場、校園、旅館、啤酒廠…）；沒填代表還沒分類
alter table venues add column if not exists venue_type text
  check (venue_type is null or venue_type in ('livehouse', 'other'));
comment on column venues.venue_type is '場地類型：livehouse / other';
