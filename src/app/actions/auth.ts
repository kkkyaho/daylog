'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/config';
import { credentials } from '@/lib/validation';
import type { Result } from '@/lib/domain';
export async function authenticate(mode: string, form: FormData): Promise<Result> {
  if (!isConfigured()) return { ok: false, error: 'Supabase 연결 설정을 먼저 완료해 주세요.' };
  const client = await createClient();
  if (mode === 'reset') {
    await requireUser();
    const password = z.string().min(8).max(128).safeParse(form.get('password'));
    if (!password.success) return { ok: false, error: '비밀번호는 8~128자로 입력해 주세요.' };
    const { error } = await client.auth.updateUser({ password: password.data });
    if (error) return { ok: false, error: '비밀번호를 변경하지 못했습니다. 복구 링크를 다시 요청해 주세요.' };
    revalidatePath('/', 'layout'); redirect('/dashboard');
  }
  if (mode === 'forgot') {
    const email = z.email().max(254).safeParse(form.get('email'));
    if (!email.success) return { ok: false, error: '이메일 주소를 확인해 주세요.' };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return { ok: false, error: '서비스 주소 설정을 먼저 완료해 주세요.' };
    const { error } = await client.auth.resetPasswordForEmail(email.data, { redirectTo: appUrl + '/auth/confirm' });
    if (error) return { ok: false, error: '메일 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    return { ok: true, message: '가입된 이메일이라면 비밀번호 재설정 안내가 발송됩니다.' };
  }
  if (mode !== 'login' && mode !== 'signup') return { ok: false, error: '잘못된 요청입니다.' };
  const input = credentials.safeParse(Object.fromEntries(form.entries()));
  if (!input.success) return { ok: false, error: input.error.issues[0].message };
  if (mode === 'signup') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return { ok: false, error: '서비스 주소 설정을 먼저 완료해 주세요.' };
    const { data, error } = await client.auth.signUp({ ...input.data, options: { emailRedirectTo: appUrl + '/auth/confirm' } });
    if (error) return { ok: false, error: '가입을 처리하지 못했습니다. 이메일과 비밀번호를 확인하거나 잠시 후 다시 시도해 주세요.' };
    if (!data.session) return { ok: true, message: '이메일로 받은 인증 링크를 열어 가입을 완료해 주세요. 이미 가입했다면 로그인해 주세요.' };
  } else {
    const { error } = await client.auth.signInWithPassword(input.data);
    if (error) return { ok: false, error: '이메일, 비밀번호 또는 이메일 인증 여부를 확인해 주세요.' };
  }
  revalidatePath('/', 'layout'); redirect('/dashboard');
}
export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw new Error('로그아웃하지 못했습니다. 다시 시도해 주세요.');
  revalidatePath('/', 'layout'); redirect('/login');
}
