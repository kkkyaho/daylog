import { AuthForm } from '@/components/auth-form';
import { requireUser } from '@/lib/supabase/server';
export default async function Reset() { await requireUser(); return <><h1>새 비밀번호 설정</h1><p className="muted">8자 이상의 새 비밀번호를 입력해 주세요.</p><AuthForm mode="reset" /></>; }
