'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus, X } from 'lucide-react';
import { analyzeIssueUrl, saveIssue } from '@/app/actions/issues';
import type { IssueDraft, IssueNote } from '@/lib/issues';
const today = () => new Date().toISOString().slice(0, 10);
const empty = (): IssueDraft => ({ title: '', source_url: null, source_type: 'manual', occurred_on: today(), summary: '', key_points: [], impact: '', follow_up: '', tags: [], analysis_status: 'manual' });
export function IssueEditor({ issue, initialOpen = false, onClose }: { issue?: IssueNote; initialOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(Boolean(issue) || initialOpen); const [draft, setDraft] = useState<IssueDraft>(issue || empty()); const [url, setUrl] = useState(issue?.source_url || ''); const [message, setMessage] = useState(''); const [pending, startTransition] = useTransition(); const router = useRouter();
  function close() { setOpen(false); setMessage(''); onClose?.(); }
  function analyze() { setMessage(''); startTransition(async () => { const result = await analyzeIssueUrl(url); if (!result.ok) return setMessage(result.error); setDraft(result.draft); setMessage('내용을 정리했습니다. 사실과 표현을 확인한 뒤 저장해 주세요.'); }); }
  function submit(form: FormData) { startTransition(async () => { const result = await saveIssue(issue?.id || null, form); if (!result.ok) return setMessage(result.error); close(); router.refresh(); }); }
  if (!open) return <button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />이슈 추가</button>;
  return <section className="editor issue-editor"><div className="editor-heading"><h2>{issue ? '이슈 기록 수정' : '새 이슈 기록'}</h2><button className="icon-button" onClick={close} aria-label="편집 닫기"><X size={20} /></button></div>
    {!issue && <div className="recipe-import"><label>유튜브 또는 웹페이지 주소<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label><button type="button" className="button secondary" disabled={pending || !url} onClick={analyze}><Link2 size={16} />{pending ? '분석 중…' : '링크 분석'}</button></div>}
    <form action={submit} key={JSON.stringify(draft)}><fieldset disabled={pending}><input type="hidden" name="source_type" value={draft.source_type} /><input type="hidden" name="analysis_status" value={draft.analysis_status} />
      <label>제목<input name="title" required maxLength={160} defaultValue={draft.title} /></label><div className="form-grid"><label>발생일<input type="date" name="occurred_on" required defaultValue={draft.occurred_on} /></label><label>태그 · 쉼표로 구분<input name="tags" defaultValue={draft.tags.join(', ')} placeholder="유튜브, 서비스 장애" /></label></div>
      <label>출처 주소<input name="source_url" type="url" maxLength={2048} defaultValue={draft.source_url || ''} /></label><label>요약<textarea name="summary" required rows={6} maxLength={10000} defaultValue={draft.summary} /></label><label>핵심 내용 · 한 줄에 하나<textarea name="key_points" rows={6} defaultValue={draft.key_points.join('\n')} /></label>
      <div className="form-grid"><label>영향<textarea name="impact" rows={4} maxLength={5000} defaultValue={draft.impact} /></label><label>후속 조치<textarea name="follow_up" rows={4} maxLength={5000} defaultValue={draft.follow_up} /></label></div>{message && <p className={message.includes('정리했습니다') ? 'success' : 'error-message'} role="status">{message}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>취소</button><button className="button primary">{pending ? '처리 중…' : '저장'}</button></div>
    </fieldset></form></section>;
}
