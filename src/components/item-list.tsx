'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, ExternalLink, MapPin, Video } from 'lucide-react';
import { deleteItem, setRoutineCompleted, setTodoCompleted } from '@/app/actions/items';
import { labels, days, type Section, type Item, type EventItem, type Todo, type Routine, type Memo, type Bookmark, type Result } from '@/lib/domain';
import { formatTime, formatDate, routineDue, seoulDate } from '@/lib/dates';
import { ItemEditor } from './item-editor';
export function ItemList({ section, items, today, completed = [], compact = false }: { section: Section; items: Item[]; today: string; completed?: string[]; compact?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(action: () => Promise<Result>) {
    setError('');
    startTransition(async function () {
      try { const result = await action(); if (!result.ok) setError(result.error); else router.refresh(); }
      catch { setError('요청을 처리하지 못했습니다. 다시 시도해 주세요.'); }
    });
  }
  function remove(item: Item) {
    const question = section === 'routines' ? '이 루틴과 모든 완료 기록을 삭제할까요?' : '이 ' + labels[section] + ' 항목을 삭제할까요?';
    if (window.confirm(question)) run(function () { return deleteItem(section, item.id); });
  }
  return <div className={compact ? 'item-list compact' : 'item-list'} aria-busy={pending}>
    {error && <p className="error-message" role="alert">{error}</p>}
    {!items.length && <div className="empty-state"><span className="empty-line" /><p>{section === 'routines' && compact ? '오늘 수행할 루틴이 없어요.' : section === 'todos' && compact ? '남은 할 일이 없어요.' : '아직 표시할 ' + labels[section] + '이 없어요.'}</p><span>새 항목을 추가해 보세요.</span></div>}
    {items.map(function (item) {
      if (editing === item.id) return <ItemEditor key={item.id} section={section} item={item} today={today} onClose={function () { setEditing(null); }} />;
      const todo = item as Todo;
      const routine = item as Routine;
      const event = item as EventItem;
      const external = section === 'schedule' && Boolean(event.provider);
      const checked = section === 'todos' ? todo.completed : completed.includes(item.id);
      const due = section === 'routines' ? routineDue(routine, new Date(today + 'T12:00:00+09:00')) : true;
      return <article className={'item-row' + (checked && (section === 'todos' || section === 'routines') ? ' is-complete' : '')} key={item.id}>
        {section === 'schedule' && <div className="event-time">{formatTime(event.starts_at)}<span>{formatTime(event.ends_at)}</span></div>}
        {(section === 'todos' || section === 'routines') && <input type="checkbox" className="completion" checked={checked} disabled={pending || (!due && !checked)} aria-label={item.title + (checked ? ' 완료 취소' : ' 완료')} onChange={function (e) { const value = e.currentTarget.checked; run(function () { return section === 'todos' ? setTodoCompleted(item.id, value) : setRoutineCompleted(item.id, value); }); }} />}
        <div className="item-content">
          {section === 'bookmarks' ? <a className="item-title bookmark-link" href={(item as Bookmark).url} target="_blank" rel="noopener noreferrer">{item.title}<ExternalLink size={14} /></a> : <strong className="item-title">{item.title}</strong>}
          {section === 'schedule' && <><div className="item-meta"><span className={'calendar-source ' + (event.provider || 'daylog')}>{event.provider === 'google' ? 'Google' : event.provider === 'microsoft' ? 'Microsoft 365' : 'Daylog'}</span><span>{formatDate(event.starts_at)}{seoulDate(new Date(event.starts_at)) !== seoulDate(new Date(event.ends_at)) ? ' ~ ' + formatDate(event.ends_at) : ''}</span>{event.location && <span><MapPin size={12} />{event.location}</span>}{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noopener noreferrer"><Video size={12}/>회의 참가</a>}{event.web_url && <a href={event.web_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12}/>원본</a>}</div>{!compact && event.description && <p className="memo-body">{event.description}</p>}</>}
          {section === 'todos' && <div className="item-meta"><span className={'priority ' + todo.priority}>{ { low: '낮음', medium: '보통', high: '높음' }[todo.priority]}</span>{todo.due_date && <span className={!todo.completed && todo.due_date < today ? 'overdue' : ''}>{todo.due_date}{!todo.completed && todo.due_date < today ? ' · 기한 지남' : ''}</span>}</div>}
          {section === 'routines' && <div className="item-meta"><span>{routine.weekdays.length === 7 ? '매일' : routine.weekdays.map(function (d) { return days[d]; }).join(' · ')}</span><span>{!routine.active ? '일시 중지' : due ? (checked ? '오늘 완료' : '오늘의 루틴') : '오늘은 쉬는 날'}</span></div>}
          {section === 'memos' && <><p className={'memo-body' + (compact ? ' clamped' : '')}>{(item as Memo).body || '내용 없음'}</p><span className="item-meta">{formatDate(item.updated_at)} 수정</span></>}
          {section === 'bookmarks' && <span className="item-meta url-text">{new URL((item as Bookmark).url).hostname}</span>}
        </div>
        {!compact && !external && <div className="row-actions"><button className="icon-button" disabled={pending} onClick={function () { setEditing(item.id); }} aria-label={item.title + ' 수정'}><Pencil size={16} /></button><button className="icon-button danger" disabled={pending} onClick={function () { remove(item); }} aria-label={item.title + ' 삭제'}><Trash2 size={16} /></button></div>}
      </article>;
    })}
  </div>;
}
