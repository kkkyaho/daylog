export const TIMEZONE = 'Asia/Seoul';
export function seoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function dayBounds(now = new Date()) {
  const date = seoulDate(now);
  const start = new Date(date + 'T00:00:00+09:00');
  return { date, start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString(), weekday: new Date(date + 'T12:00:00+09:00').getUTCDay() };
}
export function localInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16);
}
export function formatTime(iso: string) { return new Intl.DateTimeFormat('ko-KR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)); }
export function formatDate(iso: string) { return new Intl.DateTimeFormat('ko-KR', { timeZone: TIMEZONE, month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(iso)); }
export function routineDue(routine: { active: boolean; weekdays: number[]; starts_on: string }, now = new Date()) {
  const day = dayBounds(now);
  return routine.active && routine.starts_on <= day.date && routine.weekdays.includes(day.weekday);
}
