import Link from 'next/link';
import { isConfigured } from '@/lib/supabase/config';
import { redirect } from 'next/navigation';
export default function Setup() {
  if (isConfigured()) redirect('/login');
  return <main className="setup-page"><span className="eyebrow">DAYLOG · INITIAL SETUP</span><h1>데이터 연결을 준비해 주세요.</h1><p>개인정보를 저장하기 전에 Supabase 프로젝트 연결이 필요합니다.</p><ol><li>Supabase 프로젝트를 만들고 제공된 migration을 실행합니다.</li><li><code>.env.example</code>을 참고해 URL, publishable key, 서비스 주소를 설정합니다.</li><li>이메일 인증 템플릿과 redirect URL을 설정한 뒤 앱을 다시 시작합니다.</li></ol><p className="muted">자세한 절차는 프로젝트 README에 있습니다.</p><Link className="button primary" href="/login">연결 후 로그인하기</Link></main>;
}
