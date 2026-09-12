import { z } from 'zod';
import { bookmarkUrl } from './validation';

const lineArray = z.array(z.string().trim().min(1).max(500)).max(200);
export const recipeSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(120),
  source_url: z.union([bookmarkUrl, z.literal('')]).transform(value => value || null),
  source_type: z.enum(['manual', 'webpage', 'video']),
  servings: z.string().trim().max(80),
  prep_minutes: z.union([z.coerce.number().int().min(0).max(10080), z.literal('')]).transform(value => value === '' ? null : value),
  cook_minutes: z.union([z.coerce.number().int().min(0).max(10080), z.literal('')]).transform(value => value === '' ? null : value),
  ingredients: lineArray,
  steps: lineArray.max(100),
  tips: z.string().trim().max(5000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  analysis_status: z.enum(['manual', 'extracted', 'needs_review'])
});

export type RecipeDraft = z.infer<typeof recipeSchema>;
export type Recipe = RecipeDraft & { id: string; user_id: string; created_at: string; updated_at: string };
export const aiRecipeSchema = z.object({
  title: z.string().min(1).max(120), servings: z.string().max(80),
  prep_minutes: z.number().int().min(0).max(10080).nullable(), cook_minutes: z.number().int().min(0).max(10080).nullable(),
  ingredients: z.array(z.string().min(1).max(500)).max(200), steps: z.array(z.string().min(1).max(500)).max(100),
  tips: z.string().max(5000), tags: z.array(z.string().min(1).max(40)).max(20)
});

export function recipeFromForm(form: FormData): RecipeDraft {
  const lines = (name: string) => String(form.get(name) || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  return recipeSchema.parse({
    title: form.get('title'), source_url: form.get('source_url') || '',
    source_type: form.get('source_type') || 'manual', servings: form.get('servings') || '',
    prep_minutes: form.get('prep_minutes') || '', cook_minutes: form.get('cook_minutes') || '',
    ingredients: lines('ingredients'), steps: lines('steps'), tips: form.get('tips') || '',
    tags: String(form.get('tags') || '').split(',').map(v => v.trim()).filter(Boolean),
    analysis_status: form.get('analysis_status') || 'manual'
  });
}
