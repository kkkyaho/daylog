import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { recipeSchema, type RecipeDraft } from './recipes';
function secret() {
  const value = process.env.DAYLOG_IMPORT_SIGNING_SECRET;
  if (!value) throw new Error('레시피 가져오기 서명 설정이 없습니다.');
  return value;
}
export function createReviewToken(draft: RecipeDraft) {
  const payload = Buffer.from(JSON.stringify({
    issued_at: Date.now(),
    draft: recipeSchema.parse(draft)
  })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return payload + '.' + signature;
}
export function readReviewToken(token?: string): RecipeDraft | null {
  if (!token || token.length > 24000) return null;
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) return null;
  const expected = createHmac('sha256', secret()).update(payload).digest();
  let received: Buffer;
  try { received = Buffer.from(supplied, 'base64url'); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown;
    if (!decoded || typeof decoded !== 'object' || !('issued_at' in decoded) || !('draft' in decoded)) return null;
    const { issued_at, draft } = decoded as { issued_at: unknown; draft: unknown };
    if (typeof issued_at !== 'number' || !Number.isFinite(issued_at)) return null;
    const age = Date.now() - issued_at;
    if (age < -5 * 60 * 1000 || age > 24 * 60 * 60 * 1000) return null;
    return recipeSchema.parse(draft);
  } catch { return null; }
}
