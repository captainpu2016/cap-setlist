import { createClient } from '@/lib/supabase/server';

interface ExportShow {
  id: string;
  slug: string;
  title: string;
  show_date: string;
  venue: string | null;
  status: string;
  setlist_reveal_at: string | null;
  setlist_items: {
    position: number;
    notes: string | null;
    is_placeholder: boolean;
    song: { id: string; title: string } | null;
  }[];
}

function csvCell(v: string | number | null): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /admin/export?format=json|csv
 * 匯出全部場次與歌單（含草稿）當備份。middleware 已擋未登入者，這裡仍自己再驗證一次 session。
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const [{ data: shows }, { data: songs }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, slug, title, show_date, venue, status, setlist_reveal_at, setlist_items(position, notes, is_placeholder, song:songs(id, title))')
      .order('show_date', { ascending: true })
      .returns<ExportShow[]>(),
    supabase.from('songs').select('*').order('title')
  ]);

  const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const stamp = new Date().toISOString().slice(0, 10);
  const sorted = (shows ?? []).map((s) => ({
    ...s,
    setlist_items: [...s.setlist_items].sort((a, b) => a.position - b.position)
  }));

  if (format === 'csv') {
    const lines = ['show_date,show_title,venue,status,position,song_title,notes,is_placeholder'];
    for (const s of sorted) {
      if (s.setlist_items.length === 0) {
        lines.push([s.show_date, s.title, s.venue, s.status, '', '', '', ''].map(csvCell).join(','));
      }
      for (const item of s.setlist_items) {
        lines.push(
          [s.show_date, s.title, s.venue, s.status, item.position + 1, item.song?.title ?? '', item.notes, item.is_placeholder ? 1 : 0]
            .map(csvCell)
            .join(',')
        );
      }
    }
    // 開頭加 BOM，Excel 才不會把中文讀成亂碼
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="setlists-${stamp}.csv"`,
        'Cache-Control': 'no-store'
      }
    });
  }

  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), shows: sorted, songs: songs ?? [] }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="setlists-${stamp}.json"`,
      'Cache-Control': 'no-store'
    }
  });
}
