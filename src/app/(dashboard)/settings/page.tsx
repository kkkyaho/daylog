import { WidgetSettings } from '@/components/widget-settings';
import { loadWidgets } from '@/lib/queries';
import { requireUser } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
export default async function Settings() {
  const [widgets, { user }] = await Promise.all([loadWidgets(), requireUser()]);
  return <><header className="page-header"><div><span className="eyebrow">MAKE IT YOURS</span><h1>위젯 설정<span className="title-dot">.</span></h1><p>나에게 필요한 정보로 대시보드를 구성해요.</p></div></header><WidgetSettings initial={widgets} /><section className="settings-card account-settings"><h2>계정</h2><dl><div><dt>이메일</dt><dd>{user.email}</dd></div><div><dt>시간대</dt><dd>Asia/Seoul · 한국 표준시</dd></div></dl><form action={signOut}><button className="button secondary">로그아웃</button></form></section></>;
}
