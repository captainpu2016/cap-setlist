import { createSign } from 'crypto';

/**
 * Google service account 授權（只在伺服器端使用）。GA4 與 Search Console 共用同一個 service account，
 * 不另外裝 Google SDK：用金鑰自己簽 JWT 換 access token。金鑰只存在環境變數，不會送到瀏覽器。
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function loadServiceAccount(): ServiceAccount | null {
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

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

const tokenCache = new Map<string, { value: string; expiresAt: number }>();

export async function getAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
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
  tokenCache.set(scope, { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 });
  return json.access_token;
}
