import { admissionLabel, categoryLabel } from '@/lib/show-category';
import { isOverseasVenue } from '@/lib/geo';

/** 一場演出要顯示的標籤文字：分類、入場方式、海外（沒填的就不出現） */
export function showTagLabels(show: { category?: string | null; admission?: string | null; venue?: string | null }): string[] {
  return [
    categoryLabel(show.category),
    admissionLabel(show.admission),
    isOverseasVenue(show.venue) ? '海外' : null
  ].filter((x): x is string => Boolean(x));
}
