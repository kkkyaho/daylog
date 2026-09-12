'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { generateText, Output } from 'ai';
import { requireUser } from '@/lib/supabase/server';
import { bookmarkUrl, uuid } from '@/lib/validation';
import { aiRecipeSchema, recipeFromForm, recipeSchema, type RecipeDraft } from '@/lib/recipes';
import type { Result } from '@/lib/domain';

function refresh() { revalidatePath('/recipes'); }
function failure(error: unknown): Result {
  return { ok: false, error: error instanceof z.ZodError ? (error.issues[0]?.message || '입력값을 확인해 주세요.') : '레시피를 저장하지 못했습니다.' };
}
export async function saveRecipe(id: string | null, form: FormData): Promise<Result> {
  const { client, user } = await requireUser();
  try {
    if (id) uuid.parse(id);
    const values = recipeFromForm(form);
    const query = id ? client.from('recipes').update(values).eq('id', id).eq('user_id', user.id) : client.from('recipes').insert({ ...values, user_id: user.id });
    const { data, error } = await query.select('id').single();
    if (error || !data) return { ok: false, error: '레시피가 없거나 접근할 수 없습니다.' };
    refresh(); return { ok: true };
  } catch (error) { return failure(error); }
}
export async function deleteRecipe(id: string): Promise<Result> {
  const { client, user } = await requireUser();
  if (!uuid.safeParse(id).success) return { ok: false, error: '레시피가 올바르지 않습니다.' };
  const { data, error } = await client.from('recipes').delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
  if (error || !data) return { ok: false, error: '레시피를 삭제하지 못했습니다.' };
  refresh(); return { ok: true };
}
function privateAddress(address: string) {
  return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address);
}
async function safeUrl(input: string) {
  const value = bookmarkUrl.parse(input);
  const url = new URL(value);
  if (url.username || url.password || url.port || url.hostname === 'localhost' || isIP(url.hostname)) throw new Error('허용되지 않는 주소입니다.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(item => privateAddress(item.address))) throw new Error('허용되지 않는 주소입니다.');
  return url;
}
function duration(value: unknown) {
  const match = typeof value === 'string' && value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  return match ? Number(match[1] || 0) * 60 + Number(match[2] || 0) : null;
}
function text(value: unknown): string {
  if (typeof value === 'string') return value.replace(/<[^>]+>/g, '').trim();
  if (value && typeof value === 'object' && 'text' in value) return text((value as { text: unknown }).text);
  return '';
}
function findRecipe(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) { for (const item of value) { const found = findRecipe(item); if (found) return found; } }
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) return item;
    if ('@graph' in item) return findRecipe(item['@graph']);
  }
  return null;
}
export async function analyzeRecipeUrl(input: string): Promise<{ ok: true; draft: RecipeDraft } | { ok: false; error: string }> {
  const { user } = await requireUser();
  try {
    const url = await safeUrl(input);
    const response = await fetch(url, { headers: { 'user-agent': 'Daylog Recipe Importer/1.0' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('페이지를 읽을 수 없습니다.');
    const html = (await response.text()).slice(0, 2_000_000);
    let found: Record<string, unknown> | null = null;
    for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { found ||= findRecipe(JSON.parse(match[1])); } catch { /* Ignore invalid publisher metadata. */ }
    }
    const title = text(found?.name) || text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || url.hostname;
    const ingredients = Array.isArray(found?.recipeIngredient) ? found.recipeIngredient.map(text).filter(Boolean) : [];
    const instructions = found?.recipeInstructions;
    const steps = (Array.isArray(instructions) ? instructions : [instructions]).map(text).filter(Boolean);
    const video = /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(url.hostname);
    if (!ingredients.length && !steps.length) {
      const visible = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 45000);
      if (visible.length > 200) {
        try {
          const result = await generateText({
            model: 'openai/gpt-5.6-luna', output: Output.object({ schema: aiRecipeSchema }),
            prompt: '다음 웹페이지 텍스트에서 실제로 확인되는 음식 레시피만 한국어로 구조화하세요. 추측하지 말고 없는 값은 빈 문자열, 빈 배열 또는 null로 두세요. 조리 단계는 실행 순서대로 작성하세요.\n\n' + visible,
            providerOptions: { gateway: { user: user.id, tags: ['feature:recipe-import'] } }
          });
          return { ok: true, draft: recipeSchema.parse({ ...result.output, source_url: url.toString(), source_type: video ? 'video' : 'webpage', analysis_status: 'needs_review' }) };
        } catch (error) { console.error('[recipes] AI extraction failed', { message: error instanceof Error ? error.message : String(error) }); }
      }
    }
    return { ok: true, draft: recipeSchema.parse({
      title, source_url: url.toString(), source_type: video ? 'video' : 'webpage',
      servings: text(found?.recipeYield), prep_minutes: duration(found?.prepTime), cook_minutes: duration(found?.cookTime),
      ingredients, steps, tips: text(found?.description), tags: [],
      analysis_status: ingredients.length || steps.length ? 'extracted' : 'needs_review'
    }) };
  } catch (error) {
    return { ok: false, error: error instanceof z.ZodError ? '올바른 웹 주소를 입력해 주세요.' : (error instanceof Error ? error.message : '링크를 분석하지 못했습니다.') };
  }
}
