import { requireUser } from '@/lib/supabase/server';
import type { Recipe } from '@/lib/recipes';
import { RecipeEditor } from '@/components/recipe-editor';
import { RecipeList } from '@/components/recipe-list';
import { readReviewToken } from '@/lib/recipe-import';
export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ q?: string; new?: string; draft?: string }> }) {
  const { client, user } = await requireUser();
  const search = await searchParams;
  const q = (search.q || '').trim().slice(0, 80);
  const importedDraft = readReviewToken(search.draft);
  let query = client.from('recipes').select('*', { count: 'exact' }).eq('user_id', user.id).order('updated_at', { ascending: false }).limit(100);
  if (q) query = query.ilike('title', '%' + q.replace(/[%,]/g, '') + '%');
  const { data, error, count } = await query;
  if (error) throw new Error('레시피를 불러오지 못했습니다.');
  return <><header className="page-header"><div><span className="eyebrow">MY KITCHEN</span><h1>레시피<span className="title-dot">.</span></h1><p>글과 영상 속 요리를 같은 양식으로 정리해요.</p></div></header>
    <div className="create-area"><RecipeEditor initialDraft={importedDraft || undefined} initialOpen={search.new === '1' || Boolean(importedDraft)} /></div>
    <section className="list-card"><div className="list-toolbar"><form className="recipe-search"><input name="q" defaultValue={q} placeholder="레시피 제목 검색" /><button className="button secondary">검색</button></form><span className="muted">총 {count || 0}개</span></div><RecipeList recipes={(data || []) as Recipe[]} /></section>
  </>;
}
