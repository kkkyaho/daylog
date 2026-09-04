import { AuthForm } from '@/components/auth-form';
export default function Forgot() { return <><h1>비밀번호 찾기</h1><p className="muted">가입한 이메일로 재설정 링크를 보내 드립니다.</p><AuthForm mode="forgot" /></>; }
