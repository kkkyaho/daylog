'use client';
import { useState, useTransition } from 'react';
import { RefreshCw, Unplug } from 'lucide-react';
import { disconnectCalendar, syncExternalCalendars } from '@/app/actions/calendars';
import type { CalendarProvider } from '@/lib/calendar-integrations';

type Connection = { provider: CalendarProvider; account_email: string; last_synced_at: string | null };
export function CalendarConnections({ connections }: { connections: Connection[]; configured: Record<CalendarProvider, boolean> }) {
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [pending, startTransition] = useTransition();
  function run(action: () => ReturnType<typeof syncExternalCalendars>) { setMessage(''); setError(''); startTransition(async () => { const result = await action(); if (result.ok) { setMessage(result.message || '완료했습니다.'); location.reload(); } else setError(result.error); }); }
  return <section className="calendar-connections" aria-label="외부 캘린더 연결">
    <div className="integration-heading"><div><h2>연결된 캘린더</h2><p>Google 일정과 Microsoft 365의 Teams 회의를 한곳에서 확인하세요.</p></div>{connections.length > 0 && <button className="button secondary" disabled={pending} onClick={() => run(syncExternalCalendars)}><RefreshCw size={16}/>{pending ? '동기화 중…' : '지금 동기화'}</button>}</div>
      <div className="connection-grid">{(['google','microsoft'] as CalendarProvider[]).map(provider => { const connection = connections.find(item => item.provider === provider); const name = provider === 'google' ? 'Google Calendar' : 'Microsoft 365 · Teams'; return <article className={'connection-card ' + provider} key={provider}><strong>{name}</strong>{connection ? <><span>{connection.account_email || '연결됨'}</span><small>{connection.last_synced_at ? `마지막 동기화 ${new Date(connection.last_synced_at).toLocaleString('ko-KR')}` : '아직 동기화하지 않음'}</small><button className="text-button danger" disabled={pending} onClick={() => run(() => disconnectCalendar(provider))}><Unplug size={14}/>연결 해제</button></> : <><span>연결된 계정 없음</span><a className="button secondary" href={`/api/calendar/${provider}/connect`}>계정 연결</a></>}</article>; })}</div>
    {message && <p className="success-message" role="status">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}
  </section>;
}
