import { createClient } from '@/lib/supabase/server';
import { createShow } from '../actions';
import type { Venue } from '@/types/database';

export default async function NewShowPage() {
  const supabase = createClient();
  const { data: venues } = await supabase.from('venues').select('*').order('city').returns<Venue[]>();

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-stone-900">新增場次</h1>
      <p className="mt-1 text-sm text-stone-500">
        建立基本資料後即可進入歌單編輯器，場次會先以「草稿」狀態儲存。
      </p>

      <form action={createShow} className="mt-6 space-y-5">
        <div>
          <label className="admin-label" htmlFor="title">場次名稱 *</label>
          <input id="title" name="title" required className="admin-input" placeholder="例：普通隊長十週年專場" />
        </div>

        <div>
          <label className="admin-label" htmlFor="show_date">演出日期 *</label>
          <input id="show_date" name="show_date" type="date" required className="admin-input" />
        </div>

        <div>
          <label className="admin-label" htmlFor="venue_id">場地</label>
          <select id="venue_id" name="venue_id" className="admin-input" defaultValue="">
            <option value="">未指定</option>
            {(venues ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.city ? `${v.city} ${v.name}` : v.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">
            找不到想要的場地？<a href="/admin/venues/new" className="underline hover:text-stone-600">先去新增一個場地</a>。
          </p>
        </div>

        <div>
          <label className="admin-label" htmlFor="slug">網址代稱（slug）</label>
          <input id="slug" name="slug" className="admin-input" placeholder="留空則自動由名稱產生" />
        </div>

        <button type="submit" className="admin-btn">建立並進入歌單編輯器</button>
      </form>
    </div>
  );
}