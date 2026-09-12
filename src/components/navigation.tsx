'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings2, CookingPot } from 'lucide-react';
import { sections, labels } from '@/lib/domain';
import { SectionIcon } from './icons';
export function Navigation() {
  const pathname = usePathname();
  return <nav className="navigation" aria-label="주 메뉴">
    <Link href="/dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}><LayoutDashboard size={20} />대시보드</Link>
    <span className="nav-caption">MY SPACE</span>
    {sections.map(function (section) { return <Link key={section} href={'/' + section} aria-current={pathname === '/' + section ? 'page' : undefined}><SectionIcon section={section} />{labels[section]}</Link>; })}
    <Link href="/recipes" aria-current={pathname.startsWith('/recipes') ? 'page' : undefined}><CookingPot size={20} />레시피</Link>
    <Link href="/settings" aria-current={pathname === '/settings' ? 'page' : undefined}><Settings2 size={20} />위젯 설정</Link>
  </nav>;
}
