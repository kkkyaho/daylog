import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { callbackUrl, encryptToken, type CalendarProvider } from '@/lib/calendar-integrations';
import { requireUser } from '@/lib/supabase/server';

type Tokens = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
function valid(value: string): value is CalendarProvider { return value === 'google' || value === 'microsoft'; }
function back(code: string) { return NextResponse.redirect(new URL(`/schedule?calendar_error=${code}`, process.env.NEXT_PUBLIC_APP_URL)); }
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params;
  if (!valid(raw)) return back('provider');
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = await cookies();
  const expected = jar.get(`calendar_oauth_${raw}`)?.value;
  jar.delete(`calendar_oauth_${raw}`);
  if (!code || !state || !expected || state !== expected) return back('state');
  try {
    const { client, user } = await requireUser();
    const body = new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: callbackUrl(raw) });
    if (raw === 'google') { body.set('client_id', process.env.GOOGLE_CALENDAR_CLIENT_ID || ''); body.set('client_secret', process.env.GOOGLE_CALENDAR_CLIENT_SECRET || ''); }
    else { body.set('client_id', process.env.MICROSOFT_CALENDAR_CLIENT_ID || ''); body.set('client_secret', process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || ''); body.set('scope', 'openid email offline_access User.Read Calendars.Read'); }
    const tokenUrl = raw === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
    if (!tokenResponse.ok) return back('token');
    const tokens = await tokenResponse.json() as Tokens;
    const profileUrl = raw === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName';
    const profileResponse = await fetch(profileUrl, { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' });
    const profile = profileResponse.ok ? await profileResponse.json() as { email?: string; mail?: string; userPrincipalName?: string } : {};
    const existing = await client.from('calendar_connections').select('refresh_token_encrypted').eq('user_id', user.id).eq('provider', raw).maybeSingle();
    const saved = await client.from('calendar_connections').upsert({
      user_id: user.id, provider: raw, account_email: profile.email || profile.mail || profile.userPrincipalName || '',
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing.data?.refresh_token_encrypted || null,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(), scopes: (tokens.scope || '').split(' ').filter(Boolean)
    }, { onConflict: 'user_id,provider' });
    if (saved.error) return back('save');
    return NextResponse.redirect(new URL('/schedule?calendar_connected=' + raw, process.env.NEXT_PUBLIC_APP_URL));
  } catch { return back('unknown'); }
}
