import Link from 'next/link';
import { SlidersHorizontal, CalendarDays, CheckCircle2, Repeat2 } from 'lucide-react';
import { loadDashboard } from '@/lib/queries';
import { type Item } from '@/lib/domain';
import { formatDate } from '@/lib/dates';
import { WidgetCard } from '@/components/widget-card';
import { ItemList } from '@/components/item-list';
export default async function Dashboard() {
  const { results, widgets, completed, routineCompletedCount, today } = await loadDashboard();
  const total = results.routines.count || 0;
  const visible = widgets.filter(function (widget) { return widget.visible; });
  return <>
    <header className="page-header"><div><span className="eyebrow">{formatDate(today + 'T12:00:00+09:00')}</span><h1>오늘의 대시보드<span className="title-dot">.</span></h1><p>오늘의 계획을 확인하고, 하나씩 채워 보세요.</p></div><Link className="button secondary" href="/settings"><SlidersHorizontal size={17} />위젯 설정</Link></header>
    <section className="summary" aria-label="오늘의 요약"><div><span className="summary-icon blue"><CalendarDays size={22} /></span><span>오늘 일정<strong>{results.schedule.count || 0}<small>개</small></strong></span></div><div><span className="summary-icon orange"><CheckCircle2 size={22} /></span><span>남은 할 일<strong>{results.todos.count || 0}<small>개</small></strong></span></div><div><span className="summary-icon purple"><Repeat2 size={22} /></span><span>오늘의 루틴<strong>{routineCompletedCount}<small>/ {total} 완료</small></strong></span><span className="completion-percent">{total ? Math.round(routineCompletedCount / total * 100) : 0}%</span></div></section>
    <div className="section-heading"><h2>나의 하루</h2><span className="muted">서울 시간 기준</span></div>
    {!visible.length && <div className="empty-state card"><h2>표시 중인 위젯이 없어요.</h2><Link href="/settings" className="button secondary">위젯 설정 열기</Link></div>}
    <section className="dashboard-grid" aria-label="생활 위젯">{visible.map(function (widget) {
      const key = widget.key;
      const result = results[key];
      return <WidgetCard section={key} count={result.count || 0} key={key}>
        <ItemList section={key} items={(result.data || []) as Item[]} today={today} completed={completed} compact />
      </WidgetCard>;
    })}</section>
  </>;
}
