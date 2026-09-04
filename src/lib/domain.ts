export const sections = ['schedule', 'todos', 'routines', 'memos', 'bookmarks'] as const;
export type Section = typeof sections[number];
export const labels: Record<Section, string> = { schedule: '일정', todos: '할 일', routines: '루틴', memos: '메모', bookmarks: '북마크' };
export const tables = { schedule: 'events', todos: 'todos', routines: 'routines', memos: 'memos', bookmarks: 'bookmarks' } as const;
export type Widget = { key: Section; visible: boolean };
export const defaultWidgets: Widget[] = sections.map(function (key) { return { key, visible: true }; });
export type Base = { id: string; user_id: string; title: string; created_at: string; updated_at: string };
export type EventItem = Base & { starts_at: string; ends_at: string; location: string; description: string };
export type Todo = Base & { due_date: string | null; priority: 'low' | 'medium' | 'high'; completed: boolean };
export type Routine = Base & { weekdays: number[]; starts_on: string; active: boolean };
export type Memo = Base & { body: string };
export type Bookmark = Base & { url: string };
export type Item = EventItem | Todo | Routine | Memo | Bookmark;
export type Result = { ok: true; message?: string } | { ok: false; error: string };
export const days = ['일', '월', '화', '수', '목', '금', '토'];
export function isSection(value: string): value is Section { return sections.includes(value as Section); }
