import { getAccessToken, loadServiceAccount } from '@/lib/google-auth';

/**
 * GA4 Data API（只在伺服器端使用）。授權方式見 lib/google-auth.ts，再呼叫 REST 的 runReport。
 */

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export function isGa4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID && loadServiceAccount());
}

export interface ReportRow {
  dims: string[];
  metrics: number[];
}

interface ReportOptions {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  metrics: string[];
  orderBy?: { metric?: string; dimension?: string; desc?: boolean };
  limit?: number;
  dimensionFilter?: unknown;
}

export async function runReport(opts: ReportOptions): Promise<ReportRow[]> {
  const sa = loadServiceAccount();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!sa || !propertyId) throw new Error('GA4 尚未設定');
  const token = await getAccessToken(sa, SCOPE);

  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
    dimensions: (opts.dimensions ?? []).map((name) => ({ name })),
    metrics: opts.metrics.map((name) => ({ name })),
    limit: opts.limit ?? 10
  };
  if (opts.orderBy) {
    body.orderBys = [
      {
        desc: opts.orderBy.desc ?? true,
        ...(opts.orderBy.metric
          ? { metric: { metricName: opts.orderBy.metric } }
          : { dimension: { dimensionName: opts.orderBy.dimension } })
      }
    ];
  }
  if (opts.dimensionFilter) body.dimensionFilter = opts.dimensionFilter;

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // GA 數據本來就有延遲，快取一小時可以省配額、後台也會比較快
    next: { revalidate: 3600 }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 API 錯誤（${res.status}）：${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
  };
  return (json.rows ?? []).map((r) => ({
    dims: (r.dimensionValues ?? []).map((d) => d.value),
    metrics: (r.metricValues ?? []).map((m) => Number(m.value))
  }));
}
