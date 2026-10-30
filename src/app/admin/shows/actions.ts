'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify, taipeiInputToIso } from '@/lib/format';

async function requireSession() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return supabase;
}

export async function createShow(formData: FormData) {
  const supabase = await requireSession();

  const title = (formData.get('title') as string)?.trim();
  const showDate = formData.get('show_date') as string;
  const venueId = (formData.get('venue_id') as string)?.trim() || null;
  let slug = (formData.get('slug') as string)?.trim();

  if (!title || !showDate) throw new Error('場次名稱與日期為必填');
  if (!slug) slug = slugify(title);

  let venueText: string | null = null;
  if (venueId) {
    const { data: venueRow } = await supabase.from('venues').select('name, city').eq('id', venueId).single();
    if (venueRow) venueText = venueRow.city ? `${venueRow.city} ${venueRow.name}` : venueRow.name;
  }

  const { data, error } = await supabase
    .from('shows')
    .insert({ title, show_date: showDate, venue: venueText, venue_id: venueId, slug, status: 'draft' })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/shows');
  redirect(`/admin/shows/${data.id}/setlist`);
}

export async function updateShowInfo(formData: FormData) {
  const supabase = await requireSession();

  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const showDate = formData.get('show_date') as string;
  const venueId = (formData.get('venue_id') as string)?.trim() || null;
  const slug = (formData.get('slug') as string)?.trim();
  const status = formData.get('status') as 'draft' | 'published';
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null;
  const setlistRevealRaw = (formData.get('setlist_reveal_at') as string)?.trim();
  const setlistRevealAt = setlistRevealRaw ? taipeiInputToIso(setlistRevealRaw) : null;

  if (!title || !showDate || !slug) throw new Error('場次名稱、日期、slug 為必填');

  let venueText: string | null = null;
  if (venueId) {
    const { data: venueRow } = await supabase.from('venues').select('name, city').eq('id', venueId).single();
    if (venueRow) venueText = venueRow.city ? `${venueRow.city} ${venueRow.name}` : venueRow.name;
  }

  const { error } = await supabase
    .from('shows')
    .update({
      title,
      show_date: showDate,
      venue: venueText,
      venue_id: venueId,
      slug,
      status,
      cover_image_url: coverImageUrl,
      setlist_reveal_at: setlistRevealAt
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/shows');
  revalidatePath(`/admin/shows/${id}/setlist`);
  revalidatePath(`/show/${slug}`);
  revalidatePath(`/show/${slug}/card`);
  revalidatePath('/tour');
}

export async function deleteShow(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/shows');
  redirect('/admin/shows');
}

// ---------------------------------------------------------------------
// 歌單項目
// ---------------------------------------------------------------------

export async function addSetlistItem(formData: FormData) {
  const supabase = await requireSession();

  const showId = formData.get('show_id') as string;
  const songId = formData.get('song_id') as string | null;
  const isPlaceholder = formData.get('is_placeholder') === '1';

  const { data: existing } = await supabase
    .from('setlist_items')
    .select('position')
    .eq('show_id', showId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from('setlist_items').insert({
    show_id: showId,
    song_id: isPlaceholder ? null : songId,
    is_placeholder: isPlaceholder,
    position: nextPosition
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

export async function removeSetlistItem(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const showId = formData.get('show_id') as string;

  const { error } = await supabase.from('setlist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

export async function updateSetlistItemNotes(formData: FormData) {
  const supabase = await requireSession();
  const id = formData.get('id') as string;
  const showId = formData.get('show_id') as string;
  const notes = (formData.get('notes') as string)?.trim() || null;

  const { error } = await supabase.from('setlist_items').update({ notes }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shows/${showId}/setlist`);
}

/** 拖曳排序後，前端把新的順序（item id 陣列）一次送過來覆寫 position */
export async function reorderSetlistItems(showId: string, orderedIds: string[]) {
  'use server';
  const supabase = await requireSession();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('setlist_items').update({ position: index }).eq('id', id)
    )
  );

  revalidatePath(`/admin/shows/${showId}/setlist`);
}

// ---------------------------------------------------------------------
// 批次匯入／複製歌單
// ---------------------------------------------------------------------

export type ImportRow = {
  /** 貼上的原始歌名（已去掉開頭的序號） */
  title: string;
  /** 對到資料庫現有歌曲就有值；null 代表找不到 */
  songId: string | null;
  matchedTitle: string | null;
  /** 這一行是「敬請期待」之類的占位 */
  placeholder: boolean;
};

/** 比對用的正規化：全半形統一、大小寫統一、去掉空白與標點 */
function normalizeTitle(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　.,!?'"`~:;()\[\]{}<>\-_/\\|＆&·・、，。！？：；「」『』（）]/g, '');
}

/** 去掉開頭的序號，如「1.」「02、」「3)」，但保留像「100 秒的紅燈」這種以數字開頭的歌名 */
function stripNumbering(line: string): string {
  return line.replace(/^\s*\d{1,2}\s*[.、)）:：\-]\s*/, '').trim();
}

const PLACEHOLDER_WORDS = new Set(['敬請期待', 'tbd', '待定', '???', '？？？']);

/** 第一步：解析貼上的文字，並對照歌曲資料庫，回傳預覽用的結果（不寫入任何資料） */
export async function previewSetlistImport(text: string): Promise<ImportRow[]> {
  const supabase = await requireSession();
  const lines = text
    .split(/\r?\n/)
    .map(stripNumbering)
    .filter(Boolean)
    .slice(0, 80);

  const { data: songs } = await supabase.from('songs').select('id, title').returns<{ id: string; title: string }[]>();
  const index = new Map<string, { id: string; title: string }>();
  for (const s of songs ?? []) {
    const key = normalizeTitle(s.title);
    if (key && !index.has(key)) index.set(key, s);
  }

  return lines.map((title) => {
    if (PLACEHOLDER_WORDS.has(title.toLowerCase())) {
      return { title, songId: null, matchedTitle: null, placeholder: true };
    }
    const hit = index.get(normalizeTitle(title));
    return { title, songId: hit?.id ?? null, matchedTitle: hit?.title ?? null, placeholder: false };
  });
}

async function showSlug(supabase: Awaited<ReturnType<typeof requireSession>>, showId: string) {
  const { data } = await supabase.from('shows').select('slug').eq('id', showId).single<{ slug: string }>();
  return data?.slug ?? null;
}

function refreshPublicPages(showId: string, slug: string | null) {
  revalidatePath(`/admin/shows/${showId}/setlist`);
  revalidatePath('/');
  revalidatePath('/shows');
  revalidatePath('/search');
  revalidatePath('/stats');
  if (slug) {
    revalidatePath(`/show/${slug}`);
    revalidatePath(`/show/${slug}/card`);
  }
}

/**
 * 第二步：確認後寫入。找不到的歌會自動新增到歌曲資料庫（只有歌名，串流連結之後再補）。
 * mode = 'replace' 會先清空這場原有的歌單。
 */
export async function importSetlist(showId: string, rows: ImportRow[], mode: 'append' | 'replace') {
  const supabase = await requireSession();
  if (rows.length === 0) throw new Error('沒有可匯入的歌曲');

  // 先建立缺少的歌曲（同一個歌名只建一次）
  const missing = Array.from(new Set(rows.filter((r) => !r.placeholder && !r.songId).map((r) => r.title)));
  const created = new Map<string, string>();
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from('songs')
      .insert(missing.map((title) => ({ title })))
      .select('id, title')
      .returns<{ id: string; title: string }[]>();
    if (error) throw new Error(`新增歌曲失敗：${error.message}`);
    for (const s of data ?? []) created.set(s.title, s.id);
  }

  let start = 0;
  if (mode === 'replace') {
    const { error } = await supabase.from('setlist_items').delete().eq('show_id', showId);
    if (error) throw new Error(error.message);
  } else {
    const { data: last } = await supabase
      .from('setlist_items')
      .select('position')
      .eq('show_id', showId)
      .order('position', { ascending: false })
      .limit(1);
    start = (last?.[0]?.position ?? -1) + 1;
  }

  const { error } = await supabase.from('setlist_items').insert(
    rows.map((r, i) => ({
      show_id: showId,
      song_id: r.placeholder ? null : r.songId ?? created.get(r.title) ?? null,
      is_placeholder: r.placeholder,
      position: start + i
    }))
  );
  if (error) throw new Error(error.message);

  refreshPublicPages(showId, await showSlug(supabase, showId));
  return { imported: rows.length, createdSongs: created.size };
}

/** 把另一場的歌單複製過來（常用於同一個巡迴的連續場次） */
export async function copySetlist(showId: string, sourceShowId: string, mode: 'append' | 'replace') {
  const supabase = await requireSession();
  if (showId === sourceShowId) throw new Error('不能複製自己的歌單');

  const { data: source, error: srcError } = await supabase
    .from('setlist_items')
    .select('song_id, notes, is_placeholder, position')
    .eq('show_id', sourceShowId)
    .order('position', { ascending: true })
    .returns<{ song_id: string | null; notes: string | null; is_placeholder: boolean; position: number }[]>();
  if (srcError) throw new Error(srcError.message);
  if (!source || source.length === 0) throw new Error('來源場次沒有歌單可以複製');

  let start = 0;
  if (mode === 'replace') {
    const { error } = await supabase.from('setlist_items').delete().eq('show_id', showId);
    if (error) throw new Error(error.message);
  } else {
    const { data: last } = await supabase
      .from('setlist_items')
      .select('position')
      .eq('show_id', showId)
      .order('position', { ascending: false })
      .limit(1);
    start = (last?.[0]?.position ?? -1) + 1;
  }

  const { error } = await supabase.from('setlist_items').insert(
    source.map((s, i) => ({
      show_id: showId,
      song_id: s.song_id,
      notes: s.notes,
      is_placeholder: s.is_placeholder,
      position: start + i
    }))
  );
  if (error) throw new Error(error.message);

  refreshPublicPages(showId, await showSlug(supabase, showId));
  return { copied: source.length };
}
