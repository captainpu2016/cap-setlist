import PageHeader from '@/components/PageHeader';
import BackLink from '@/components/BackLink';

export const metadata = {
  alternates: { canonical: '/privacy' },
  title: '隱私權說明｜普通隊長',
  description: '普通隊長網站的隱私權與資料蒐集說明。'
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <div className="mt-6">
          <PageHeader eyebrow="Privacy" title="隱私權說明" />
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-400">
          <section>
            <h2 className="section-title mb-3 text-base">我們蒐集什麼</h2>
            <p>
              本網站使用 Google Analytics（GA4）了解訪客怎麼使用這個網站，例如有多少人瀏覽、瀏覽了哪些場次、
              有沒有使用播放功能。這些是匿名的整體統計趨勢，我們不會、也沒有能力用這些資料辨識出你是誰。
            </p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-base">為什麼要蒐集</h2>
            <p>
              單純是想知道哪些場次、哪些歌曲比較多人關注，幫助我們決定之後要花力氣整理哪些內容，
              不會用在其他用途，也不會賣給任何第三方。
            </p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-base">留言與「我有參與」</h2>
            <p>
              你在場次頁留下的暱稱（選填）和留言內容會公開顯示。留言與「我有參與」會用瀏覽器裡一組隨機產生的裝置代碼
              做防濫用與去重；留言只儲存這組代碼的雜湊值，不會公開，也不會用來辨識你是誰。
              我們不會蒐集你的 email 或真實姓名，請不要在留言裡放個人資料或網址。
              不適當的留言我們會隱藏或刪除；如果想刪除自己的留言，請透過我們的社群帳號聯絡。
            </p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-base">Cookie</h2>
            <p>
              Google Analytics 會在瀏覽器裡放一個小型的識別碼（cookie），只用來區分「這是不是同一位訪客」，
              不含任何可以識別你身份的資訊。你可以隨時在瀏覽器設定裡封鎖或清除這些 cookie，
              不會影響你使用本網站的任何功能。
            </p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-base">第三方服務</h2>
            <p>
              站內的播放功能會連到 Dropbox、Spotify、Apple Music、YouTube 等外部平台，
              這些平台各自有自己的隱私權政策，不在我們的管理範圍內。
            </p>
          </section>
          <section>
            <h2 className="section-title mb-3 text-base">聯絡我們</h2>
            <p>如果對這份說明有任何問題，歡迎透過我們的社群帳號聯絡。</p>
          </section>
        </div>
      </div>
    </main>
  );
}
