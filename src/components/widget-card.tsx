import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { labels, type Section } from '@/lib/domain';
import { SectionIcon } from './icons';
export function WidgetCard({ section, count, children }: { section: Section; count: number; children: React.ReactNode }) {
  const href = '/' + section + (section === 'schedule' ? '?filter=today' : section === 'todos' ? '?filter=open' : '');
  return <section className={'widget-card widget-' + section}>
    <header className="widget-header"><div><span className="widget-icon"><SectionIcon section={section} /></span><h2>{section === 'schedule' ? '오늘 일정' : labels[section]}</h2><span className="count-pill">{count}</span></div><Link href={href} className="icon-button" aria-label={labels[section] + ' 전체 보기'}><ArrowUpRight size={18} /></Link></header>
    {children}
    <Link className="widget-footer" href={'/' + section + '?new=1'}><Plus size={16} />{labels[section]} 추가</Link>
  </section>;
}
