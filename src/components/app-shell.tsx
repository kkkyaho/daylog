import Link from 'next/link';
import { Sparkles, LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { Navigation } from './navigation';
import { DayRefresh } from './day-refresh';
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return <div className="app-shell"><a className="skip-link" href="#main">본문으로 이동</a>
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark"><Sparkles size={22} /></span>daylog<span className="brand-period">.</span></Link>
      <Navigation />
      <div className="account"><span className="avatar">나</span><div><strong>나의 공간</strong><span className="email" title={email}>{email}</span></div><form action={signOut}><button className="icon-button" aria-label="로그아웃" title="로그아웃"><LogOut size={18} /></button></form></div>
    </aside>
    <main id="main" className="main-content"><DayRefresh />{children}</main>
  </div>;
}
