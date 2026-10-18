'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LockKeyhole, Eye, EyeOff } from 'lucide-react';

export function LoginScreen() {
  const { login, authError, retry } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <main className="min-h-dvh bg-[#171b22] px-4 py-10 text-white flex items-center justify-center">
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-lg font-extrabold">BM</span><div><p className="text-xl font-bold">Booran Motors</p><p className="text-sm text-slate-400">Sales Floor OS</p></div></div>
      <section className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <LockKeyhole className="mb-4 text-red-600" size={28} />
        <h1 className="text-2xl font-bold">Sign in to your showroom</h1>
        <p className="mt-2 text-sm text-slate-500">Use your account to access your authorised locations.</p>
        {authError && <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{authError}<button onClick={retry} className="ml-2 underline">Retry connection</button></div>}
        <form className="mt-6 space-y-5" onSubmit={async (event) => {
          event.preventDefault(); setSubmitting(true); setError(null);
          try { await login(email, password); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign in.'); } finally { setSubmitting(false); }
        }}>
          <label className="block text-sm font-semibold">Email address<input type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-normal" /></label>
          <label className="block text-sm font-semibold" htmlFor="login-password">Password</label>
          <div className="relative !mt-2"><input id="login-password" type={visible ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="block min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-3 pr-12" /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)} className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-500">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} className="min-h-12 w-full rounded-xl bg-red-600 px-4 font-bold text-white hover:bg-red-700 disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
      <p className="mt-6 text-center text-xs text-slate-400">Booran Motors · Authorised staff access</p>
    </div>
  </main>;
}
