import { z } from 'zod';
import { bookmarkUrl } from './validation';

const lines = z.array(z.string().trim().min(1).max(500)).max(50);
export const issueSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(160),
  source_url: z.union([bookmarkUrl, z.literal('')]).transform(value => value || null),
  source_type: z.enum(['manual', 'webpage', 'video']),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '발생일을 확인해 주세요.'),
  summary: z.string().trim().min(1, '요약을 입력해 주세요.').max(10000),
  key_points: lines,
  impact: z.string().trim().max(5000),
  follow_up: z.string().trim().max(5000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  analysis_status: z.enum(['manual', 'extracted', 'needs_review'])
});
export type IssueDraft = z.infer<typeof issueSchema>;
export type IssueNote = IssueDraft & { id: string; user_id: string; created_at: string; updated_at: string };
export const aiIssueSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(10000),
  key_points: lines,
  impact: z.string().max(5000),
  follow_up: z.string().max(5000),
  tags: z.array(z.string().min(1).max(40)).max(20)
});
export function issueFromForm(form: FormData): IssueDraft {
  return issueSchema.parse({
    title: form.get('title'), source_url: form.get('source_url') || '',
    source_type: form.get('source_type') || 'manual', occurred_on: form.get('occurred_on'),
    summary: form.get('summary'),
    key_points: String(form.get('key_points') || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean),
    impact: form.get('impact') || '', follow_up: form.get('follow_up') || '',
    tags: String(form.get('tags') || '').split(',').map(v => v.trim()).filter(Boolean),
    analysis_status: form.get('analysis_status') || 'manual'
  });
}
