'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { generateText, Output } from 'ai';
import { requireUser } from '@/lib/supabase/server';
import { bookmarkUrl, uuid } from '@/lib/validation';
import { aiIssueSchema, issueFromForm, issueSchema, type IssueDraft } from '@/lib/issues';
import type { Result } from '@/lib/domain';

function refresh() { revalidatePath('/issues'); }
function failure(error: unknown): Result { return { ok: false, error: error instanceof z.ZodError ? (error.issues[0]?.message || '입력값을 확인해 주세요.') : '이슈 기록을 저장하지 못했습니다.' }; }
export async function saveIssue(id: string | null, form: FormData): Promise<Result> {
  const { client, user } = await requireUser();
  try {
    if (id) uuid.parse(id);
    const values = issueFromForm(form);
    const query = id ? client.from('issue_notes').update(values).eq('id', id).eq('user_id', user.id) : client.from('issue_notes').insert({ ...values, user_id: user.id });
    const { data, error } = await query.select('id').single();
    if (error || !data) return { ok: false, error: '이슈 기록이 없거나 접근할 수 없습니다.' };
    refresh(); return { ok: true };
  } catch (error) { return failure(error); }
}
export async function deleteIssue(id: string): Promise<Result> {
  const { client, user } = await requireUser();
  if (!uuid.safeParse(id).success) return { ok: false, error: '이슈 기록이 올바르지 않습니다.' };
  const { data, error } = await client.from('issue_notes').delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
  if (error || !data) return { ok: false, error: '이슈 기록을 삭제하지 못했습니다.' };
  refresh(); return { ok: true };
}
function privateAddress(address: string) { return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:') || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address); }
async function safeUrl(input: string) {
  const url = new URL(bookmarkUrl.parse(input));
  if (url.username || url.password || url.port || url.hostname === 'localhost' || isIP(url.hostname)) throw new Error('허용되지 않는 주소입니다.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(item => privateAddress(item.address))) throw new Error('허용되지 않는 주소입니다.');
  return url;
}
function clean(value: string) { return value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
export async function analyzeIssueUrl(input: string): Promise<{ ok: true; draft: IssueDraft } | { ok: false; error: string }> {
  const { user } = await requireUser();
  try {
    const url = await safeUrl(input);
    const video = /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(url.hostname);
    const response = await fetch(url, { headers: { 'user-agent': 'Daylog Issue Collector/1.0' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('페이지를 읽을 수 없습니다.');
    const html = (await response.text()).slice(0, 2_000_000);
    const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname).slice(0, 160);
    const visible = clean(html).slice(0, 50000);
    if (visible.length > 150) {
      try {
        const result = await generateText({
          model: 'openai/gpt-5.6-luna', output: Output.object({ schema: aiIssueSchema }),
          prompt: '다음 웹페이지에서 확인되는 이슈를 한국어로 기록하세요. 사실만 사용하고 추측하지 마세요. summary는 3~6문장, key_points는 핵심 사실, impact는 영향, follow_up은 확인하거나 할 일을 작성하세요. 정보가 없으면 빈 값으로 두세요.\n\n제목: ' + title + '\n주소: ' + url + '\n내용: ' + visible,
          providerOptions: { gateway: { user: user.id, tags: ['feature:issue-summary'] } }
        });
        return { ok: true, draft: issueSchema.parse({ ...result.output, source_url: url.toString(), source_type: video ? 'video' : 'webpage', occurred_on: new Date().toISOString().slice(0, 10), analysis_status: 'needs_review' }) };
      } catch (error) { console.error('[issues] AI summary failed', { message: error instanceof Error ? error.message : String(error) }); }
    }
    return { ok: true, draft: issueSchema.parse({ title, source_url: url.toString(), source_type: video ? 'video' : 'webpage', occurred_on: new Date().toISOString().slice(0, 10), summary: '원문 내용을 확인해 요약을 작성해 주세요.', key_points: [], impact: '', follow_up: '', tags: [], analysis_status: 'needs_review' }) };
  } catch (error) { return { ok: false, error: error instanceof z.ZodError ? '올바른 웹 주소를 입력해 주세요.' : (error instanceof Error ? error.message : '링크를 분석하지 못했습니다.') }; }
}
