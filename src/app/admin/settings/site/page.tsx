import { getSiteContent } from '@/lib/site-settings';
import SiteContentForm from './site-content-form';

export default async function SiteContentSettingsPage() {
  const content = await getSiteContent();

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-stone-900">網站文案</h1>
      <p className="mt-1 text-sm text-stone-500">編輯前台首頁 Logo 附近顯示的文字，存檔後首頁會立即更新。</p>

      <div className="mt-6">
        <SiteContentForm content={content} />
      </div>
    </div>
  );
}
