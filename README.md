# 普通隊長歌單管理系統

依照《普通隊長歌單管理系統_開發指南.md》建置的獨立專案。前台公開瀏覽場次歌單、可一鍵生成 Spotify 播放清單；後台管理歌曲資料庫與各場次歌單。

---

## 目錄
1. [技術棧](#技術棧)
2. [專案結構](#專案結構)
3. [開發指南對照表（完成度）](#開發指南對照表完成度)
4. [安裝與設定步驟](#安裝與設定步驟)
   - 4.1 前置需求
   - 4.2 取得程式碼
   - 4.3 建立 Supabase 專案
   - 4.4 建立 Spotify Developer App
   - 4.5 設定環境變數
   - 4.6 安裝套件並啟動本機開發環境
   - 4.7 建立第一組後台管理者帳號
   - 4.8 連接 Spotify 官方帳號
5. [部署到 Vercel](#部署到-vercel)
6. [日常操作手冊](#日常操作手冊)
7. [已知限制與後續建議](#已知限制與後續建議)

---

## 技術棧

| 層級 | 選擇 |
|---|---|
| 前端框架 | Next.js 14（App Router）+ TypeScript + Tailwind CSS |
| 資料庫 | Supabase（Postgres + Auth + RLS） |
| 拖曳排序 | @dnd-kit |
| 部署 | Vercel |
| 外部 API | Spotify Web API（Apple Music 純連結，不串 API） |

---

## 專案結構

```
normal-captain-setlist/
├─ supabase/
│  └─ migrations/0001_init.sql      ← 資料庫 schema + RLS，一次貼到 Supabase SQL Editor 執行
├─ src/
│  ├─ middleware.ts                 ← 保護 /admin/* 路由
│  ├─ types/database.ts             ← 資料表 TypeScript 型別
│  ├─ lib/
│  │  ├─ supabase/{client,server,admin}.ts
│  │  ├─ spotify/client.ts          ← Spotify Web API 封裝
│  │  └─ format.ts                  ← 時長格式化、slug、Spotify URL 解析
│  └─ app/
│     ├─ page.tsx                   ← 前台：/ 場次列表
│     ├─ show/[slug]/page.tsx       ← 前台：單場次歌單頁
│     ├─ admin/
│     │  ├─ login/page.tsx
│     │  ├─ page.tsx                ← 後台總覽
│     │  ├─ songs/                  ← 歌曲資料庫 CRUD
│     │  ├─ shows/                  ← 場次列表 + 歌單編輯器（含拖曳排序）
│     │  └─ settings/spotify/       ← Spotify 官方帳號授權設定
│     └─ api/
│        ├─ shows/[id]/generate-playlist/route.ts
│        └─ auth/spotify/{route.ts, callback/route.ts}, logout/route.ts
├─ .env.example
├─ package.json
└─ tailwind.config.ts
```

---

## 開發指南對照表（完成度）

| 開發指南章節 | 狀態 | 備註 |
|---|---|---|
| 2. 前台 `/`、`/show/[slug]` | ✅ | |
| 2. 後台 6 條路由 | ✅ | |
| 3. 四張資料表 + 索引 | ✅ | `supabase/migrations/0001_init.sql` |
| 3.4 RLS 規劃 | ✅ | songs/shows/setlist_items 公開讀、寫入需登入；app_settings 完全鎖死，只有 service role 可讀寫 |
| 4. Supabase Auth 登入 + middleware 保護 | ✅ | |
| 4. API Route 二次驗證身份 | ✅ | 所有寫入用的 Server Action 都會先檢查 session；generate-playlist 全程用 service role，前端拿不到憑證 |
| 5.1 歌曲資料庫（搜尋、篩選、使用次數） | ✅ | |
| 5.1 Spotify 網址自動解析 track ID | ✅ | `lib/format.ts` `parseSpotifyTrackId` |
| 5.2 歌單編輯器（選歌、拖曳排序、notes、佔位曲目） | ✅ | 用 @dnd-kit 實作拖曳 |
| 5.2 場次先存檔才寫入歌單 | ✅ | 建立場次時先 insert shows 拿到 id，才能進入歌單編輯器 |
| 5.3 Spotify OAuth 一次性設定頁 | ✅ | |
| 6.1 場次列表（近期／歷史分區） | ✅ | |
| 6.2 單場次頁（placeholder 顯示「敬請期待」、Apple Music 逐首連結） | ✅ | |
| 6.4 生成播放清單流程 + 併發保護 | ✅ | 見下方「已知限制」關於併發的說明 |
| Phase 6：SEO / meta / OG | ✅（基本） | `generateMetadata` 動態產生 title/description/OG |
| Phase 6：空狀態 / 錯誤狀態 | ✅（基本） | 各列表頁皆有「目前沒有資料」提示；Spotify token 失效會回傳明確錯誤訊息 |
| 第 9 節「未來擴充方向」 | ⏳ 刻意未做 | 依指南保留資料結構彈性，之後要加「熱門曲目」「訪客最愛」「song.link」都不需要改 schema |

---

## 安裝與設定步驟

### 4.1 前置需求
- Node.js 20 LTS 以上
- 一組 [Supabase](https://supabase.com) 帳號（免費方案即可起步）
- 一組 [Spotify Developer](https://developer.spotify.com/dashboard) 帳號，且**用來建立播放清單的官方帳號**要先準備好（例如樂團的官方 Spotify 帳號）
- 一組 [Vercel](https://vercel.com) 帳號（正式部署用）

### 4.2 取得程式碼
把整個 `normal-captain-setlist` 資料夾放進一個全新的 Git repo（依指南要求，與其他專案完全獨立）：

```bash
cd normal-captain-setlist
git init
git add .
git commit -m "init: 普通隊長歌單管理系統"
```

之後再自行 push 到 GitHub / GitLab 等平台，供 Vercel 串接。

### 4.3 建立 Supabase 專案
1. 到 Supabase Dashboard 點「New Project」，取獨立的名稱（例如 `normal-captain-setlist`），選擇離使用者最近的 region（如 Singapore）。
2. 專案建立完成後，進入左側選單 **SQL Editor** → New query，把 `supabase/migrations/0001_init.sql` 整份內容貼上，按 Run。
   - 這一步會建立 `songs` / `shows` / `setlist_items` / `app_settings` 四張表、索引、trigger，以及全部的 RLS policies。
3. 進入 **Project Settings → API**，記下三組值，稍後填進 `.env.local`：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（**絕對不能**放進前端程式碼或任何 `NEXT_PUBLIC_` 開頭的變數）
4. 進入 **Authentication → Providers**，確認 Email 登入是開啟的（預設就是）；**Authentication → Settings** 裡把「Allow new users to sign up」關閉，避免開放註冊（指南 4 節要求只建立 1-2 組帳號）。

### 4.4 建立 Spotify Developer App
1. 到 https://developer.spotify.com/dashboard 用**要拿來建立播放清單的官方帳號**登入，點「Create app」。
2. App name / description 隨意填，**Redirect URI** 這欄非常重要，先填本機開發用的：
   ```
   http://127.0.0.1:3000/api/auth/spotify/callback
   ```
   （Spotify 現在不接受 `localhost`，要用 `127.0.0.1`；正式上線後要在同一個 App 設定裡「再加一筆」正式網域的 callback URL，兩筆並存即可，不需要新建 App）
3. 建立完成後，在 App 的 Settings 頁面可以看到 `Client ID` 和 `Client Secret`，記下來填進 `.env.local`。

### 4.5 設定環境變數
複製範例檔並填入實際值：

```bash
cp .env.example .env.local
```

編輯 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=（4.3 步驟拿到的 Project URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（4.3 步驟拿到的 anon key）
SUPABASE_SERVICE_ROLE_KEY=（4.3 步驟拿到的 service_role key）
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
SPOTIFY_CLIENT_ID=（4.4 步驟拿到的 Client ID）
SPOTIFY_CLIENT_SECRET=（4.4 步驟拿到的 Client Secret）
```

### 4.6 安裝套件並啟動本機開發環境

```bash
npm install
npm run dev
```

打開 `http://127.0.0.1:3000` 應該會看到前台場次列表（此時是空的）；打開 `http://127.0.0.1:3000/admin` 會被導去登入頁（此時還沒有帳號，見下一步）。

### 4.7 建立第一組後台管理者帳號
Supabase 預設關閉開放註冊後，管理者帳號要從後台手動建立：

1. Supabase Dashboard → **Authentication → Users** → 「Add user」→「Create new user」。
2. 填入 email + password，記得勾選 **Auto Confirm User**（否則要額外收驗證信才能登入）。
3. 回到 `http://127.0.0.1:3000/admin/login` 用這組帳密登入即可進入後台。
4. 若有協作的工作人員，用同樣方式再建立第二組帳號（指南建議只開 1-2 組，不做開放註冊）。

### 4.8 連接 Spotify 官方帳號
1. 登入後台後，前往 **Spotify 設定**（`/admin/settings/spotify`）。
2. 點「連接 Spotify 官方帳號」，會導向 Spotify 官方授權頁，用**官方帳號**登入並同意授權（scope 是 `playlist-modify-public`，只會用來建立公開播放清單，不會動到帳號其他資料）。
3. 授權完成會導回設定頁，顯示「已連接」。這一步只需要做一次，除非之後 token 在 Spotify 端被撤銷才需要重新連接。

到這裡，本機開發環境就完整可用了：可以在後台新增歌曲、建立場次、編輯歌單、上架，並在前台生成播放清單。

---

## 部署到 Vercel

1. 把 repo push 到 GitHub（或 GitLab / Bitbucket）。
2. Vercel Dashboard →「Add New Project」→ 選這個 repo → Framework 會自動偵測為 Next.js，不用改設定。
3. 在 **Environment Variables** 區塊，把 `.env.local` 裡的六組變數全部貼上，其中 `NEXT_PUBLIC_SITE_URL` 改成正式網域（例如 `https://setlist.normalcaptain.com`，或先用 Vercel 配的 `https://xxx.vercel.app`）。
4. 點 Deploy。
5. **回到 Spotify Developer Dashboard**，在同一個 App 的 Redirect URIs 裡「新增」一筆正式網域的 callback：
   ```
   https://你的正式網域/api/auth/spotify/callback
   ```
   儲存後即可。
6. 部署完成後，用 4.7 建立的帳號登入正式站的 `/admin/login`，並依 4.8 重新連接一次 Spotify 官方帳號（**不同網域要各自連接一次**，因為 callback URL 不同）。
7. 若使用自訂網域，記得到 Vercel 的 Domains 設定裡綁定，並確認 `NEXT_PUBLIC_SITE_URL` 與實際網域一致（Spotify OAuth 的 redirect_uri 依賴這個變數）。

---

## 日常操作手冊

**新增一首歌**
`/admin/songs` → 「+ 新增歌曲」→ 填歌名，貼上 Spotify 網址（會自動解析成 track ID）、Apple Music 網址（直接存完整網址）→ 儲存。

**建立一場演出並上架**
1. `/admin/shows` → 「+ 新增場次」，填場次名稱、日期、場地（slug 可留空自動產生）→ 建立後會直接進入歌單編輯器。
2. 左側搜尋歌曲、點擊加入右側歌單；順序可直接拖曳調整；每首歌可加註 notes（例如「安可曲」）。
3. 安可曲還沒確定時，點「+ 加入未定曲目佔位」，前台會顯示「敬請期待」。
4. 都編好之後，在頁面上方把「上架狀態」切成「已上架」→ 儲存場次資料，這場才會出現在前台 `/`。

**訪客生成播放清單**
訪客在單場次頁按「生成播放清單」時全自動，不需要後台操作。第一次生成後網址會存進資料庫，之後所有訪客看到的都是同一份連結（不會重複建立）。

**Spotify token 失效怎麼辦**
如果訪客按生成播放清單時看到「Spotify 官方帳號尚未連接或授權已失效」，回 `/admin/settings/spotify` 重新點一次「連接」即可，不影響已經生成好的舊播放清單。

---

## 已知限制與後續建議

- **併發保護是「盡量降低風險」而非資料庫層級鎖**：目前用 `update ... where spotify_playlist_url is null` 做二次確認，在極端情況下（兩位訪客在同一毫秒都通過第一次檢查）理論上仍可能建立兩份播放清單。若這個場景很在意，可以之後加一個 Postgres advisory lock 或 unique constraint + 重試邏輯強化。
- **歌單「使用次數」統計**目前是即時用 `setlist_items(count)` 查詢，場次多了以後可以之後依第 9 節規劃做成快取欄位或排程統計。
- **圖片/封面**：目前 schema 和頁面都沒有場次封面圖欄位，若之後要加，`shows` 表可以新增 `cover_image_url`。
- **自動化測試**：目前沒有寫測試，建議之後至少針對 `generate-playlist` API Route 和 `parseSpotifyTrackId` 補上單元測試。
- 第 9 節列的三個未來方向（熱門曲目推薦、訪客最愛場次、song.link 整合）目前刻意不做，但現有 schema（`setlist_items` 關聯表、`songs` 獨立表）已經足以支援，之後要加不需要動到既有資料結構。
