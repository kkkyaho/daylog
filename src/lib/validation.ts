import { z } from 'zod';
import { sections, type Section } from './domain';
const title = z.string().trim().min(1, '제목을 입력해 주세요.').max(120, '제목은 120자까지 입력할 수 있습니다.');
export const uuid = z.uuid();
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(function (value) {
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, '올바른 날짜를 입력해 주세요.');
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(function (value) {
  return dateOnly.safeParse(value.slice(0, 10)).success && Number(value.slice(11, 13)) < 24 && Number(value.slice(14)) < 60;
}, '올바른 시간을 입력해 주세요.').transform(function (value) { return new Date(value + ':00+09:00').toISOString(); });
export const bookmarkUrl = z.string().trim().max(2048).url('올바른 URL을 입력해 주세요.').refine(function (value) { return ['http:', 'https:'].includes(new URL(value).protocol); }, 'HTTP 또는 HTTPS 주소만 가능합니다.');
const event = z.object({ title, starts_at: dateTime, ends_at: dateTime, location: z.string().trim().max(200), description: z.string().trim().max(2000) }).refine(function (value) { return value.ends_at > value.starts_at; }, { message: '종료 시간은 시작 시간 이후여야 합니다.', path: ['ends_at'] });
const todo = z.object({ title, due_date: z.union([dateOnly, z.literal('')]).transform(function (value) { return value || null; }), priority: z.enum(['low', 'medium', 'high']) });
const routine = z.object({ title, weekdays: z.array(z.number().int().min(0).max(6)).min(1, '반복 요일을 선택해 주세요.').max(7).refine(function (values) { return new Set(values).size === values.length; }), starts_on: dateOnly, active: z.boolean() });
const memo = z.object({ title, body: z.string().max(20000, '메모는 20,000자까지 입력할 수 있습니다.') });
const bookmark = z.object({ title, url: bookmarkUrl });
export function parseItem(section: Section, form: FormData) {
  const input = Object.fromEntries(form.entries());
  switch (section) {
    case 'schedule': return event.parse(input);
    case 'todos': return todo.parse(input);
    case 'routines': return routine.parse({ ...input, weekdays: form.getAll('weekdays').map(Number), active: form.get('active') === 'on' });
    case 'memos': return memo.parse(input);
    case 'bookmarks': return bookmark.parse(input);
  }
}
export const widgetSchema = z.array(z.object({ key: z.enum(sections), visible: z.boolean() }).strict()).length(5).refine(function (items) { return new Set(items.map(function (item) { return item.key; })).size === 5; }, '위젯 목록이 올바르지 않습니다.');
export const credentials = z.object({ email: z.email('이메일 주소를 확인해 주세요.').max(254), password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(128) });
