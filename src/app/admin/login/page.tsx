'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('登入失敗，請確認帳號密碼是否正確。');
      setLoading(false);
      return;
    }

    router.replace(searchParams.get('redirectedFrom') || '/admin');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-xl font-bold text-stone-900">普通隊長後台</h1>
        <p className="mt-1 text-sm text-stone-500">管理者登入</p>

        <div className="mt-6">
          <label className="admin-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-input"
            autoComplete="username"
          />
        </div>

        <div className="mt-4">
          <label className="admin-label" htmlFor="password">密碼</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            autoComplete="current-password"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="admin-btn mt-6 w-full">
          {loading ? '登入中…' : '登入'}
        </button>
      </form>
    </main>
  );
}
