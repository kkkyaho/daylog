'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { authenticate } from '@/app/actions/auth';
import type { Result } from '@/lib/domain';
export function AuthForm({ mode, initialError = false }: { mode: 'login' | 'signup' | 'forgot' | 'reset'; initialError?: boolean }) {
  const [result, setResult] = useState<Result | null>(initialError ? { ok: false, error: '인증 링크가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요.' } : null);
  const [pending, startTransition] = useTransition();
  const titles = { login: '로그인', signup: '계정 만들기', forgot: '재설정 메일 받기', reset: '새 비밀번호 저장' };
  function submit(form: FormData) {
    setResult(null);
    startTransition(async function () { setResult(await authenticate(mode, form)); });
  }
  return <form action={submit} className="auth-form">
    {mode !== 'reset' && <label>이메일<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>}
    {mode !== 'forgot' && <label>{mode === 'reset' ? '새 비밀번호' : '비밀번호'}<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} placeholder="8자 이상 입력" /></label>}
    {result && <p className={result.ok ? 'success' : 'error-message'} role={result.ok ? 'status' : 'alert'}>{result.ok ? result.message : result.error}</p>}
    <button className="button primary" disabled={pending}>{pending ? '처리 중…' : titles[mode]}</button>
    <div className="auth-links">{mode === 'login' ? <><Link href="/signup">계정 만들기</Link><Link href="/forgot-password">비밀번호 찾기</Link></> : <Link href="/login">로그인으로 돌아가기</Link>}</div>
  </form>;
}
