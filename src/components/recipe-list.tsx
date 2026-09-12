'use client';
import { useState, useTransition } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteRecipe } from '@/app/actions/recipes';
import type { Recipe } from '@/lib/recipes';
import { RecipeEditor } from './recipe-editor';
export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function remove(recipe: Recipe) {
    if (!window.confirm('이 레시피를 삭제할까요?')) return;
    startTransition(async () => { const result = await deleteRecipe(recipe.id); if (!result.ok) setError(result.error); else router.refresh(); });
  }
  return <div className="recipe-list" aria-busy={pending}>{error && <p className="error-message">{error}</p>}
    {!recipes.length && <div className="empty-state"><span className="empty-line" /><p>저장한 레시피가 없어요.</p><span>링크를 분석하거나 직접 추가해 보세요.</span></div>}
    {recipes.map(recipe => editing === recipe.id ? <RecipeEditor key={recipe.id} recipe={recipe} onClose={() => setEditing(null)} /> : <article className="recipe-card" key={recipe.id}>
      <div className="recipe-card-head"><div><span className="recipe-status">{recipe.source_type === 'video' ? '영상' : recipe.source_type === 'webpage' ? '웹 레시피' : '직접 작성'}</span><h2>{recipe.title}</h2></div><div className="row-actions"><button className="icon-button" onClick={() => setEditing(recipe.id)} aria-label={recipe.title + ' 수정'}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(recipe)} aria-label={recipe.title + ' 삭제'}><Trash2 size={16} /></button></div></div>
      <div className="recipe-meta">{recipe.servings && <span>{recipe.servings}</span>}{recipe.prep_minutes != null && <span>준비 {recipe.prep_minutes}분</span>}{recipe.cook_minutes != null && <span>조리 {recipe.cook_minutes}분</span>}</div>
      {recipe.ingredients.length > 0 && <section><h3>재료</h3><ul>{recipe.ingredients.map((value, i) => <li key={i}>{value}</li>)}</ul></section>}
      {recipe.steps.length > 0 && <section><h3>만드는 법</h3><ol>{recipe.steps.map((value, i) => <li key={i}>{value}</li>)}</ol></section>}
      {recipe.tips && <p className="recipe-tip">{recipe.tips}</p>}
      <footer><div>{recipe.tags.map(tag => <span className="recipe-tag" key={tag}>#{tag}</span>)}</div>{recipe.source_url && <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">원문 보기 <ExternalLink size={14} /></a>}</footer>
    </article>)}
  </div>;
}
