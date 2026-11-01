import { createSign } from 'crypto';

/**
 * GA4 Data API（只在伺服器端使用）。不另外裝 Google SDK：用 service account 金鑰自己簽 JWT 換 access token，
 * 再呼叫 REST 的 runReport。金鑰只存在環境變數，不會送到瀏覽器。
 */

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: String(parsed.private_key).replace(/\\n/g, '\n') };
      }
    } catch {
      return null;
    }
  }
  const email = process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GA4_PRIVATE_KEY;
  if (email && key) return { client_email: email, private_key: key.replace(/\\n/g, '\n') };
  return null;
}

export function isGa4Configured(): boolean {
  return Boolean(process.env.GA4_PROPERTY_ID && loadServiceAccount());
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key, 'base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`
    }),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`取得 Google 授權失敗（${res.status}）：請確認 service account 金鑰是否正確`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
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
  const token = await getAccessToken(sa);

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
