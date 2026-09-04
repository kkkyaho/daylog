import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSection, labels } from '@/lib/domain';
import { loadSection } from '@/lib/queries';
import { ItemEditor } from '@/components/item-editor';
import { ItemList } from '@/components/item-list';
export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ page?: string; filter?: string; new?: string }> }) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const search = await searchParams;
  const number = Number(search.page || 1);
  const page = Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1;
  const filter = section === 'todos' && ['open', 'done'].includes(search.filter || '') ? search.filter! : section === 'schedule' && search.filter === 'today' ? 'today' : 'all';
  const { items, count, completed, today } = await loadSection(section, page, filter);
  const descriptions = { schedule: '다가오는 약속과 일정을 정리해요.', todos: '해야 할 일을 적고, 끝낸 일은 체크해요.', routines: '작은 반복이 쌓이는 나의 루틴.', memos: '생각과 기억을 가볍게 남겨요.', bookmarks: '다시 찾고 싶은 페이지를 모아 두세요.' };
  const filters = section === 'todos' ? [['all', '전체'], ['open', '미완료'], ['done', '완료']] : section === 'schedule' ? [['all', '전체'], ['today', '오늘']] : [];
  return <><header className="page-header"><div><span className="eyebrow">MY SPACE</span><h1>{labels[section]}<span className="title-dot">.</span></h1><p>{descriptions[section]}</p></div></header>
    <div className="create-area"><ItemEditor section={section} today={today} initialOpen={search.new === '1'} key={section + (search.new || '')} /></div>
    <section className="list-card"><div className="list-toolbar"><div className="filter-tabs" aria-label="목록 필터">{filters.length ? filters.map(function ([value, label]) { return <Link href={'/' + section + '?filter=' + value} aria-current={filter === value ? 'page' : undefined} key={value}>{label}</Link>; }) : <h2>{labels[section]} 목록</h2>}</div><span className="muted">총 {count}개</span></div>
      <ItemList section={section} items={items} today={today} completed={completed} />
      <nav className="pagination" aria-label="페이지 이동">{page > 1 ? <Link className="button secondary" href={'/' + section + '?filter=' + filter + '&page=' + (page - 1)}>이전</Link> : <span /> }<span>{page} / {Math.max(1, Math.ceil(count / 30))}</span>{page * 30 < count && <Link className="button secondary" href={'/' + section + '?filter=' + filter + '&page=' + (page + 1)}>다음</Link>}</nav>
    </section></>;
}
