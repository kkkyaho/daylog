'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { labels, defaultWidgets, type Widget, type Result } from '@/lib/domain';
import { saveWidgetSettings } from '@/app/actions/items';
import { SectionIcon } from './icons';
export function WidgetSettings({ initial }: { initial: Widget[] }) {
  const [widgets, setWidgets] = useState(initial);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function move(index: number, by: number) { setResult(null); const next = [...widgets]; [next[index], next[index + by]] = [next[index + by], next[index]]; setWidgets(next); }
  function save() { startTransition(async function () { try { const saved = await saveWidgetSettings(widgets); setResult(saved); if (saved.ok) router.refresh(); } catch { setResult({ ok: false, error: '연결을 확인한 후 다시 시도해 주세요.' }); } }); }
  const dirty = JSON.stringify(widgets) !== JSON.stringify(initial);
  return <section className="settings-card"><h2>대시보드 구성</h2><p className="muted">표시할 위젯을 선택하고 순서를 바꿔 보세요.</p>
    <ol className="widget-settings">{widgets.map(function (widget, index) { return <li key={widget.key}><span className="order-number">{String(index + 1).padStart(2, '0')}</span><SectionIcon section={widget.key} /><label className="widget-label">{labels[widget.key]}<input type="checkbox" role="switch" checked={widget.visible} disabled={pending} onChange={function (e) { setResult(null); const visible = e.currentTarget.checked; setWidgets(widgets.map(function (w) { return w.key === widget.key ? { ...w, visible } : w; })); }} aria-label={labels[widget.key] + ' 표시'} /></label><div className="row-actions"><button className="icon-button" disabled={pending || index === 0} onClick={function () { move(index, -1); }} aria-label={labels[widget.key] + ' 위로 이동'}><ArrowUp size={18} /></button><button className="icon-button" disabled={pending || index === widgets.length - 1} onClick={function () { move(index, 1); }} aria-label={labels[widget.key] + ' 아래로 이동'}><ArrowDown size={18} /></button></div></li>; })}</ol>
    {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error-message'}>{result.ok ? result.message : result.error}</p>}
    <div className="form-actions"><span className="muted">{dirty ? '저장하지 않은 변경사항이 있어요.' : '저장된 설정입니다.'}</span><button className="button secondary" disabled={pending} onClick={function () { setResult(null); setWidgets(defaultWidgets); }}>기본값</button><button className="button primary" disabled={pending || !dirty} onClick={save}>{pending ? '저장 중…' : '설정 저장'}</button></div>
  </section>;
}
