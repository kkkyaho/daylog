'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/server';
import { isSection, tables, type Result, type Widget } from '@/lib/domain';
import { parseItem, uuid, widgetSchema } from '@/lib/validation';
import { dayBounds, routineDue } from '@/lib/dates';

function refresh(section: string) { revalidatePath('/dashboard'); revalidatePath('/' + section); }
function invalid(error: unknown): Result {
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message || '입력값을 확인해 주세요.' };
  return { ok: false, error: '저장하지 못했습니다. 연결을 확인한 후 다시 시도해 주세요.' };
}
export async function saveItem(section: string, id: string | null, form: FormData): Promise<Result> {
  const { client, user } = await requireUser();
  if (!isSection(section)) return { ok: false, error: '지원하지 않는 항목입니다.' };
  try {
    if (id) uuid.parse(id);
    const values = parseItem(section, form);
    const query = id
      ? client.from(tables[section]).update(values).eq('id', id).eq('user_id', user.id)
      : client.from(tables[section]).insert({ ...values, user_id: user.id });
    const { data, error } = await query.select('id').single();
    if (error || !data) return { ok: false, error: '저장하지 못했습니다. 항목이 없거나 접근할 수 없습니다.' };
    refresh(section); return { ok: true };
  } catch (error) { return invalid(error); }
}
export async function deleteItem(section: string, id: string): Promise<Result> {
  const { client, user } = await requireUser();
  if (!isSection(section) || !uuid.safeParse(id).success) return { ok: false, error: '항목이 올바르지 않습니다.' };
  const { data, error } = await client.from(tables[section]).delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
  if (error || !data) return { ok: false, error: '삭제하지 못했습니다. 항목이 없거나 접근할 수 없습니다.' };
  refresh(section); return { ok: true };
}
export async function setTodoCompleted(id: string, completed: boolean): Promise<Result> {
  const { client, user } = await requireUser();
  if (!uuid.safeParse(id).success || typeof completed !== 'boolean') return { ok: false, error: '입력값이 올바르지 않습니다.' };
  const { data, error } = await client.from('todos').update({ completed }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
  if (error || !data) return { ok: false, error: '완료 상태를 변경하지 못했습니다.' };
  refresh('todos'); return { ok: true };
}
export async function setRoutineCompleted(id: string, completed: boolean): Promise<Result> {
  const { client, user } = await requireUser();
  if (!uuid.safeParse(id).success || typeof completed !== 'boolean') return { ok: false, error: '입력값이 올바르지 않습니다.' };
  const now = new Date();
  const day = dayBounds(now);
  const { data: routine, error: readError } = await client.from('routines').select('active,weekdays,starts_on').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (readError || !routine || (completed && !routineDue(routine, now))) return { ok: false, error: '오늘 수행할 루틴인지 확인해 주세요.' };
  const { error } = completed
    ? await client.from('routine_logs').upsert({ routine_id: id, user_id: user.id, completed_on: day.date }, { onConflict: 'routine_id,completed_on', ignoreDuplicates: true })
    : await client.from('routine_logs').delete().eq('routine_id', id).eq('user_id', user.id).eq('completed_on', day.date);
  if (error) return { ok: false, error: '루틴 완료 상태를 저장하지 못했습니다.' };
  refresh('routines'); return { ok: true };
}
export async function saveWidgetSettings(widgets: Widget[]): Promise<Result> {
  const { client, user } = await requireUser();
  const parsed = widgetSchema.safeParse(widgets);
  if (!parsed.success) return { ok: false, error: '위젯 설정이 올바르지 않습니다.' };
  const { error } = await client.from('dashboard_settings').upsert({ user_id: user.id, widgets: parsed.data });
  if (error) return { ok: false, error: '설정을 저장하지 못했습니다.' };
  refresh('settings'); return { ok: true, message: '위젯 설정을 저장했습니다.' };
}
