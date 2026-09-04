'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { saveItem } from '@/app/actions/items';
import { labels, days, type Section, type Item, type EventItem, type Todo, type Routine, type Memo, type Bookmark } from '@/lib/domain';
import { localInput } from '@/lib/dates';
export function ItemEditor({ section, item, today, onClose, initialOpen = false }: { section: Section; item?: Item; today: string; onClose?: () => void; initialOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(item) || initialOpen);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function close() { setOpen(false); setError(''); onClose?.(); }
  function submit(form: FormData) {
    setError('');
    startTransition(async function () {
      try {
        const result = await saveItem(section, item?.id || null, form);
        if (!result.ok) { setError(result.error); return; }
        close(); router.refresh();
      } catch { setError('요청을 처리하지 못했습니다. 연결을 확인해 주세요.'); }
    });
  }
  if (!open) return <button className="button primary" onClick={function () { setOpen(true); }}><Plus size={17} />{labels[section]} 추가</button>;
  return <section className="editor" aria-label={labels[section] + ' 편집'}>
    <div className="editor-heading"><h2>{labels[section]} {item ? '수정' : '추가'}</h2><button className="icon-button" onClick={close} disabled={pending} aria-label="편집 닫기"><X size={20} /></button></div>
    <form action={submit}>
      <fieldset disabled={pending}>
        <label>제목<input name="title" defaultValue={item?.title || ''} required maxLength={120} placeholder={labels[section] + ' 제목'} /></label>
        {section === 'schedule' && <>
          <div className="form-grid"><label>시작 · 한국 시간<input type="datetime-local" name="starts_at" required defaultValue={item ? localInput((item as EventItem).starts_at) : today + 'T09:00'} /></label><label>종료 · 한국 시간<input type="datetime-local" name="ends_at" required defaultValue={item ? localInput((item as EventItem).ends_at) : today + 'T10:00'} /></label></div>
          <label>장소<input name="location" maxLength={200} defaultValue={(item as EventItem)?.location || ''} /></label>
          <label>설명<textarea name="description" maxLength={2000} rows={3} defaultValue={(item as EventItem)?.description || ''} /></label>
        </>}
        {section === 'todos' && <div className="form-grid"><label>마감일 · 선택<input type="date" name="due_date" defaultValue={(item as Todo)?.due_date || ''} /></label><label>우선순위<select name="priority" defaultValue={(item as Todo)?.priority || 'medium'}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></label></div>}
        {section === 'routines' && <>
          <fieldset className="weekdays"><legend>반복 요일</legend>{days.map(function (day, index) { return <label key={day}><input type="checkbox" name="weekdays" value={index} defaultChecked={(item as Routine)?.weekdays.includes(index) ?? true} /><span>{day}</span></label>; })}</fieldset>
          <label>시작일<input type="date" name="starts_on" required defaultValue={(item as Routine)?.starts_on || today} /></label>
          <label className="checkbox-label"><input name="active" type="checkbox" defaultChecked={(item as Routine)?.active ?? true} />루틴 활성화</label>
        </>}
        {section === 'memos' && <label>내용<textarea name="body" maxLength={20000} rows={8} defaultValue={(item as Memo)?.body || ''} placeholder="기억하고 싶은 내용을 적어 보세요." /></label>}
        {section === 'bookmarks' && <label>웹 주소<input name="url" type="url" required maxLength={2048} defaultValue={(item as Bookmark)?.url || ''} placeholder="https://example.com" /></label>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button secondary" onClick={close}>취소</button><button className="button primary">{pending ? '저장 중…' : '저장'}</button></div>
      </fieldset>
    </form>
  </section>;
}
