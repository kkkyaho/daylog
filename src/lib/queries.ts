import 'server-only';
import { requireUser } from './supabase/server';
import { dayBounds } from './dates';
import { defaultWidgets, tables, type Item, type Section, type Widget } from './domain';
import { widgetSchema } from './validation';

export async function loadWidgets(): Promise<Widget[]> {
  const { client, user } = await requireUser();
  const { data, error } = await client.from('dashboard_settings').select('widgets').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('위젯 설정을 불러오지 못했습니다.');
  if (!data) return defaultWidgets;
  const parsed = widgetSchema.safeParse(data.widgets);
  if (!parsed.success) throw new Error('위젯 설정 형식을 확인해 주세요.');
  return parsed.data;
}
export async function loadSection(section: Section, page = 1, filter = 'all') {
  const { client, user } = await requireUser();
  const day = dayBounds();
  let query = client.from(tables[section]).select('*', { count: 'exact' }).eq('user_id', user.id);
  if (section === 'todos') {
    if (filter === 'open' || filter === 'done') query = query.eq('completed', filter === 'done');
    query = query.order('completed').order('due_date', { nullsFirst: false });
  } else if (section === 'schedule') {
    if (filter === 'today') query = query.lt('starts_at', day.end).gt('ends_at', day.start);
    query = query.order('starts_at', { ascending: filter === 'today' });
  } else if (section === 'routines') query = query.order('active', { ascending: false }).order('created_at');
  else query = query.order(section === 'memos' ? 'updated_at' : 'created_at', { ascending: false });
  const result = await query.order('id').range((page - 1) * 30, page * 30 - 1);
  if (result.error) throw new Error('목록을 불러오지 못했습니다.');
  const ids = result.data.map(function (item) { return item.id as string; });
  let completed: string[] = [];
  if (section === 'routines' && ids.length) {
    const logs = await client.from('routine_logs').select('routine_id').eq('user_id', user.id).eq('completed_on', day.date).in('routine_id', ids);
    if (logs.error) throw new Error('루틴 완료 기록을 불러오지 못했습니다.');
    completed = logs.data.map(function (log) { return log.routine_id; });
  }
  return { items: result.data as Item[], count: result.count || 0, completed, today: day.date };
}
export async function loadDashboard() {
  const { client, user } = await requireUser();
  const day = dayBounds();
  const [schedule, todos, routines, memos, bookmarks, done, widgets] = await Promise.all([
    client.from('events').select('*', { count: 'exact' }).eq('user_id', user.id).lt('starts_at', day.end).gt('ends_at', day.start).order('starts_at').order('id').limit(5),
    client.from('todos').select('*', { count: 'exact' }).eq('user_id', user.id).eq('completed', false).order('due_date', { nullsFirst: false }).order('id').limit(5),
    client.from('routines').select('*', { count: 'exact' }).eq('user_id', user.id).eq('active', true).lte('starts_on', day.date).contains('weekdays', [day.weekday]).order('created_at').order('id').limit(5),
    client.from('memos').select('*', { count: 'exact' }).eq('user_id', user.id).order('updated_at', { ascending: false }).order('id').limit(5),
    client.from('bookmarks').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).order('id').limit(5),
    client.from('routine_logs').select('routine_id,routines!inner(active,starts_on,weekdays)', { count: 'exact' }).eq('user_id', user.id).eq('completed_on', day.date).eq('routines.active', true).lte('routines.starts_on', day.date).contains('routines.weekdays', [day.weekday]).limit(1),
    loadWidgets()
  ]);
  const results = { schedule, todos, routines, memos, bookmarks };
  if (Object.values(results).some(function (r) { return r.error; }) || done.error) throw new Error('대시보드를 불러오지 못했습니다.');
  const visibleRoutineIds = (routines.data || []).map(function (r) { return r.id; });
  let completed: string[] = [];
  if (visibleRoutineIds.length) {
    const logs = await client.from('routine_logs').select('routine_id').eq('user_id', user.id).eq('completed_on', day.date).in('routine_id', visibleRoutineIds);
    if (logs.error) throw new Error('루틴 완료 기록을 불러오지 못했습니다.');
    completed = logs.data.map(function (r) { return r.routine_id; });
  }
  return { results, widgets, completed, routineCompletedCount: done.count || 0, today: day.date };
}
