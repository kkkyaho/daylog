'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus, X } from 'lucide-react';
import { analyzeRecipeUrl, saveRecipe } from '@/app/actions/recipes';
import type { Recipe, RecipeDraft } from '@/lib/recipes';

const empty: RecipeDraft = { title: '', source_url: null, source_type: 'manual', servings: '', prep_minutes: null, cook_minutes: null, ingredients: [], steps: [], tips: '', tags: [], analysis_status: 'manual' };
export function RecipeEditor({ recipe, initialDraft, initialOpen = false, onClose }: { recipe?: Recipe; initialDraft?: RecipeDraft; initialOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(Boolean(recipe) || initialOpen);
  const [draft, setDraft] = useState<RecipeDraft>(recipe || initialDraft || empty);
  const [url, setUrl] = useState(recipe?.source_url || '');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function close() { setOpen(false); setMessage(''); onClose?.(); }
  function analyze() {
    setMessage(''); startTransition(async () => {
      const result = await analyzeRecipeUrl(url);
      if (!result.ok) return setMessage(result.error);
      setDraft(result.draft);
      setMessage(result.draft.analysis_status === 'extracted' ? '레시피 내용을 추출했습니다. 확인 후 저장해 주세요.' : '제목만 가져왔습니다. 영상 자막이나 내용을 직접 채워 주세요.');
    });
  }
  function submit(form: FormData) {
    startTransition(async () => {
      const result = await saveRecipe(recipe?.id || null, form);
      if (!result.ok) return setMessage(result.error);
      close(); router.refresh();
    });
  }
  if (!open) return <button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />레시피 추가</button>;
  return <section className="editor recipe-editor" aria-label="레시피 편집">
    <div className="editor-heading"><h2>{recipe ? '레시피 수정' : '새 레시피'}</h2><button className="icon-button" onClick={close} aria-label="편집 닫기"><X size={20} /></button></div>
    {!recipe && <div className="recipe-import"><label>레시피 글 또는 영상 주소<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label><button type="button" className="button secondary" disabled={pending || !url} onClick={analyze}><Link2 size={16} />{pending ? '분석 중…' : '링크 분석'}</button></div>}
    <form action={submit} key={JSON.stringify(draft)}><fieldset disabled={pending}>
      <input type="hidden" name="source_type" value={draft.source_type} /><input type="hidden" name="analysis_status" value={draft.analysis_status} />
      <label>제목<input name="title" required maxLength={120} defaultValue={draft.title} /></label>
      <label>출처 주소<input name="source_url" type="url" maxLength={2048} defaultValue={draft.source_url || ''} /></label>
      <div className="form-grid"><label>분량<input name="servings" maxLength={80} defaultValue={draft.servings} placeholder="예: 2인분" /></label><label>태그 · 쉼표로 구분<input name="tags" defaultValue={draft.tags.join(', ')} placeholder="한식, 간단요리" /></label></div>
      <div className="form-grid"><label>준비 시간 · 분<input type="number" name="prep_minutes" min="0" max="10080" defaultValue={draft.prep_minutes ?? ''} /></label><label>조리 시간 · 분<input type="number" name="cook_minutes" min="0" max="10080" defaultValue={draft.cook_minutes ?? ''} /></label></div>
      <label>재료 · 한 줄에 하나<textarea name="ingredients" rows={7} defaultValue={draft.ingredients.join('\n')} placeholder="김치 150g&#10;밥 2공기" /></label>
      <label>조리 단계 · 한 줄에 하나<textarea name="steps" rows={9} defaultValue={draft.steps.join('\n')} /></label>
      <label>팁과 메모<textarea name="tips" rows={4} maxLength={5000} defaultValue={draft.tips} /></label>
      {message && <p className={message.includes('추출했습니다') ? 'success' : 'error-message'} role="status">{message}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={close}>취소</button><button className="button primary">{pending ? '처리 중…' : '저장'}</button></div>
    </fieldset></form>
  </section>;
}
