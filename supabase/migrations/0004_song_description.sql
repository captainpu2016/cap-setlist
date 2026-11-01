-- 歌曲介紹：翻唱歌（也可用在自己的歌）在前台歌曲頁顯示的一段文字，後台歌曲編輯頁填寫
alter table songs add column if not exists description text;
