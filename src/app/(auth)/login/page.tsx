import { AuthForm } from '@/components/auth-form';
import { isConfigured } from '@/lib/supabase/config';
import { redirect } from 'next/navigation';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) { if (!isConfigured()) redirect('/setup'); const params = await searchParams; return <><span className="eyebrow">WELCOME BACK</span><h1>나의 하루를 시작해요.</h1><p className="muted">이메일로 로그인해 주세요.</p><AuthForm mode="login" initialError={Boolean(params.error)} /></>; }
