import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { callbackUrl, providerConfigured, type CalendarProvider } from '@/lib/calendar-integrations';
import { requireUser } from '@/lib/supabase/server';

function valid(value: string): value is CalendarProvider { return value === 'google' || value === 'microsoft'; }
export async function GET(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  await requireUser();
  const { provider: raw } = await params;
  if (!valid(raw) || !providerConfigured(raw)) return NextResponse.redirect(new URL('/schedule?calendar_error=not_configured', process.env.NEXT_PUBLIC_APP_URL));
  const state = randomBytes(32).toString('base64url');
  const jar = await cookies();
  jar.set(`calendar_oauth_${raw}`, state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  const redirect = callbackUrl(raw);
  const url = raw === 'google' ? new URL('https://accounts.google.com/o/oauth2/v2/auth') : new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.search = new URLSearchParams(raw === 'google' ? {
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!, redirect_uri: redirect, response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/calendar.readonly', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state
  } : {
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID!, redirect_uri: redirect, response_type: 'code', response_mode: 'query',
    scope: 'openid email offline_access User.Read Calendars.Read', state
  }).toString();
  return NextResponse.redirect(url);
}
