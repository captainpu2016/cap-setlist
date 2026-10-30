import { createClient } from '@/lib/supabase/server';
import { formatDateTimeTW } from '@/lib/format';
import { deleteComment, setCommentStatus } from './actions';

interface Row {
  id: string;
  nickname: string;
  body: string;
  status: 'visible' | 'hidden';
  report_count: number;
  created_at: string;
  show: { title: string; slug: string } | null;
}

export default async function AdminCommentsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = createClient();
  const filter = searchParams.filter === 'hidden' ? 'hidden' : searchParams.filter === 'reported' ? 'reported' : 'all';

  let query = supabase
    .from('show_comments')
    .select('id, nickname, body, status, report_count, created_at, show:shows(title, slug)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter === 'hidden') query = query.eq('status', 'hidden');
  if (filter === 'reported') query = query.gt('report_count', 0);

  const { data, error } = await query.returns<Row[]>();

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'reported', label: '被檢舉' },
    { key: 'hidden', label: '已隱藏' }
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-stone-900">留言管理</h1>
      <p className="mt-1 text-sm text-stone-500">留言通過檢查就會直接顯示；這裡可以隱藏、恢復或刪除。累積 3 位不同訪客檢舉會自動隱藏。</p>

      {error && (
        <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          讀取失敗：{error.message}。如果還沒建立留言資料表，請先到 Supabase 的 SQL Editor 執行
          <code className="mx-1">supabase/migrations/0002_show_comments.sql</code>。
        </p>
      )}

      <nav className="mt-6 flex gap-2 text-sm">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={t.key === 'all' ? '/admin/comments' : `/admin/comments?filter=${t.key}`}
            className={`rounded-md px-3 py-1.5 ${filter === t.key ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
        {(data ?? []).length === 0 && !error && <li className="p-4 text-sm text-stone-500">沒有符合的留言。</li>}
        {(data ?? []).map((c) => (
          <li key={c.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="font-medium text-stone-900">{c.nickname}</span>
              <span>{formatDateTimeTW(c.created_at)}</span>
              {c.show && (
                <a href={`/show/${c.show.slug}#comments`} target="_blank" rel="noreferrer" className="truncate hover:underline">
                  {c.show.title}
                </a>
              )}
              {c.report_count > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">{c.report_count} 人檢舉</span>}
              {c.status === 'hidden' && <span className="rounded bg-stone-200 px-2 py-0.5 text-stone-600">已隱藏</span>}
            </div>
            <p className="mt-2 whitespace-pre-line break-words text-sm text-stone-800">{c.body}</p>
            <div className="mt-3 flex gap-2">
              <form action={setCommentStatus}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value={c.status === 'visible' ? 'hidden' : 'visible'} />
                <button className="admin-btn-secondary">{c.status === 'visible' ? '隱藏' : '恢復顯示'}</button>
              </form>
              <form action={deleteComment}>
                <input type="hidden" name="id" value={c.id} />
                <button className="admin-btn-danger">刪除</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
