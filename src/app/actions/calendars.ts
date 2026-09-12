'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/server';
import { syncCalendar } from '@/lib/calendar-sync';
import { type CalendarConnection, type CalendarProvider } from '@/lib/calendar-integrations';
import type { Result } from '@/lib/domain';

export async function syncExternalCalendars(): Promise<Result> {
  const { client, user } = await requireUser();
  const result = await client.from('calendar_connections').select('*').eq('user_id', user.id);
  if (result.error) return { ok: false, error: '캘린더 연결 정보를 불러오지 못했습니다.' };
  if (!result.data.length) return { ok: false, error: '먼저 외부 캘린더를 연결해 주세요.' };
  try {
    const counts = await Promise.all((result.data as CalendarConnection[]).map(syncCalendar));
    revalidatePath('/schedule'); revalidatePath('/dashboard');
    return { ok: true, message: `외부 일정 ${counts.reduce((a, b) => a + b, 0)}개를 동기화했습니다.` };
  } catch (error) {
    console.error('[calendar] sync failed', error instanceof Error ? error.message : error);
    return { ok: false, error: error instanceof Error ? error.message : '캘린더 동기화에 실패했습니다.' };
  }
}
export async function disconnectCalendar(provider: CalendarProvider): Promise<Result> {
  const { client, user } = await requireUser();
  if (provider !== 'google' && provider !== 'microsoft') return { ok: false, error: '지원하지 않는 캘린더입니다.' };
  const result = await client.from('calendar_connections').delete().eq('user_id', user.id).eq('provider', provider);
  if (result.error) return { ok: false, error: '캘린더 연결을 해제하지 못했습니다.' };
  revalidatePath('/schedule'); revalidatePath('/dashboard');
  return { ok: true, message: '캘린더 연결을 해제했습니다.' };
}
