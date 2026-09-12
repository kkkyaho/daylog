import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type CalendarProvider = 'google' | 'microsoft';
export type CalendarConnection = {
  id: string; provider: CalendarProvider; account_email: string;
  access_token_encrypted: string; refresh_token_encrypted: string | null;
  token_expires_at: string | null; scopes: string[]; last_synced_at: string | null;
};

function key() {
  const secret = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('캘린더 토큰 암호화 설정이 없습니다.');
  return createHash('sha256').update(secret).digest();
}
export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(v => v.toString('base64url')).join('.');
}
export function decryptToken(value: string) {
  const [iv, tag, encrypted] = value.split('.').map(v => Buffer.from(v, 'base64url'));
  if (!iv || !tag || !encrypted) throw new Error('저장된 캘린더 토큰이 올바르지 않습니다.');
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
export function providerConfigured(provider: CalendarProvider) {
  return provider === 'google'
    ? Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_CALENDAR_CLIENT_ID && process.env.MICROSOFT_CALENDAR_CLIENT_SECRET);
}
export function callbackUrl(provider: CalendarProvider) {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) throw new Error('서비스 주소 설정이 없습니다.');
  return `${origin}/api/calendar/${provider}/callback`;
}
