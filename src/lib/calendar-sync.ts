import 'server-only';
import { decryptToken, encryptToken, type CalendarConnection, type CalendarProvider } from './calendar-integrations';
import { requireUser } from './supabase/server';

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
type NormalizedEvent = { external_id: string; title: string; starts_at: string; ends_at: string; is_all_day: boolean; location: string; description: string; web_url: string | null; meeting_url: string | null; organizer: string; status: string };

async function calendarApiError(response: Response, provider: CalendarProvider): Promise<never> {
  let reason = '';
  try {
    const body = await response.json() as { error?: { code?: string | number; message?: string; status?: string; errors?: Array<{ reason?: string }> } };
    reason = body.error?.errors?.[0]?.reason || body.error?.status || body.error?.message || String(body.error?.code || '');
  } catch { reason = 'invalid_error_response'; }
  console.error('[calendar] provider request failed', { provider, status: response.status, reason });
  throw new Error(provider === 'google' ? `Google 일정을 불러오지 못했습니다. (${response.status})` : `Microsoft 일정을 불러오지 못했습니다. (${response.status})`);
}

async function refreshAccess(connection: CalendarConnection) {
  if (!connection.refresh_token_encrypted) throw new Error('다시 연결해 주세요.');
  const provider = connection.provider;
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decryptToken(connection.refresh_token_encrypted) });
  if (provider === 'google') {
    body.set('client_id', process.env.GOOGLE_CALENDAR_CLIENT_ID || ''); body.set('client_secret', process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '');
  } else {
    body.set('client_id', process.env.MICROSOFT_CALENDAR_CLIENT_ID || ''); body.set('client_secret', process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || '');
    body.set('scope', 'offline_access User.Read Calendars.Read');
  }
  const url = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  if (!response.ok) throw new Error('캘린더 연결을 갱신하지 못했습니다.');
  return await response.json() as TokenResponse;
}

async function accessToken(connection: CalendarConnection) {
  if (!connection.token_expires_at || new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) return { token: decryptToken(connection.access_token_encrypted), refreshed: null as TokenResponse | null };
  const refreshed = await refreshAccess(connection);
  return { token: refreshed.access_token, refreshed };
}
function googleTime(value: { dateTime?: string; date?: string }) {
  if (value.dateTime) return value.dateTime;
  return new Date(`${value.date}T00:00:00+09:00`).toISOString();
}
function microsoftTime(value: { dateTime: string; timeZone: string }) {
  const text = value.dateTime.endsWith('Z') ? value.dateTime : value.dateTime + 'Z';
  return new Date(text).toISOString();
}

export async function syncCalendar(connection: CalendarConnection) {
  const { client, user } = await requireUser();
  const auth = await accessToken(connection);
  if (auth.refreshed) await client.from('calendar_connections').update({ access_token_encrypted: encryptToken(auth.refreshed.access_token), refresh_token_encrypted: auth.refreshed.refresh_token ? encryptToken(auth.refreshed.refresh_token) : connection.refresh_token_encrypted, token_expires_at: new Date(Date.now() + (auth.refreshed.expires_in || 3600) * 1000).toISOString() }).eq('id', connection.id).eq('user_id', user.id);
  const start = new Date(); start.setMonth(start.getMonth() - 3);
  const end = new Date(); end.setFullYear(end.getFullYear() + 1);
  let events: NormalizedEvent[] = [];
  if (connection.provider === 'google') {
    const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '2500', timeMin: start.toISOString(), timeMax: end.toISOString(), orderBy: 'startTime' });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { authorization: `Bearer ${auth.token}` }, cache: 'no-store' });
    if (!response.ok) return calendarApiError(response, 'google');
    const data = await response.json() as { items?: Array<any> };
    events = (data.items || []).filter(e => e.status !== 'cancelled' && e.start && e.end).map(e => ({ external_id: e.id, title: e.summary || '(제목 없음)', starts_at: googleTime(e.start), ends_at: googleTime(e.end), is_all_day: Boolean(e.start.date), location: e.location || '', description: e.description || '', web_url: e.htmlLink || null, meeting_url: e.hangoutLink || e.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri || null, organizer: e.organizer?.email || '', status: e.status || 'confirmed' }));
  } else {
    const params = new URLSearchParams({ startDateTime: start.toISOString(), endDateTime: end.toISOString(), '$top': '1000', '$select': 'id,subject,start,end,isAllDay,location,bodyPreview,webLink,onlineMeeting,organizer,isCancelled' });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, { headers: { authorization: `Bearer ${auth.token}`, Prefer: 'outlook.timezone="UTC"' }, cache: 'no-store' });
    if (!response.ok) return calendarApiError(response, 'microsoft');
    const data = await response.json() as { value?: Array<any> };
    events = (data.value || []).filter(e => !e.isCancelled).map(e => ({ external_id: e.id, title: e.subject || '(제목 없음)', starts_at: microsoftTime(e.start), ends_at: microsoftTime(e.end), is_all_day: Boolean(e.isAllDay), location: e.location?.displayName || '', description: e.bodyPreview || '', web_url: e.webLink || null, meeting_url: e.onlineMeeting?.joinUrl || null, organizer: e.organizer?.emailAddress?.address || '', status: 'confirmed' }));
  }
  const rows = events.map(event => ({ ...event, user_id: user.id, connection_id: connection.id, provider: connection.provider, calendar_id: 'primary' }));
  const deleted = await client.from('external_events').delete().eq('connection_id', connection.id).eq('user_id', user.id);
  if (deleted.error) throw new Error('기존 외부 일정을 정리하지 못했습니다.');
  if (rows.length) { const saved = await client.from('external_events').insert(rows); if (saved.error) throw new Error('외부 일정을 저장하지 못했습니다.'); }
  await client.from('calendar_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id).eq('user_id', user.id);
  return events.length;
}

export function providerLabel(provider: CalendarProvider) { return provider === 'google' ? 'Google Calendar' : 'Microsoft 365 · Teams'; }
