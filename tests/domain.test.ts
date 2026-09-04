import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayBounds, routineDue, seoulDate, localInput } from '../src/lib/dates';
import { bookmarkUrl, dateOnly, parseItem, widgetSchema } from '../src/lib/validation';
import { defaultWidgets } from '../src/lib/domain';

test('서울 자정 경계에서 날짜/요일/UTC 조회 구간이 함께 전환된다', function () {
  assert.equal(seoulDate(new Date('2026-09-04T14:59:59Z')), '2026-09-04');
  assert.deepEqual(dayBounds(new Date('2026-09-04T15:00:00Z')), { date: '2026-09-05', weekday: 6, start: '2026-09-04T15:00:00.000Z', end: '2026-09-05T15:00:00.000Z' });
  assert.equal(localInput('2026-09-04T15:00:00Z'), '2026-09-05T00:00');
});
test('루틴은 시작일 전/비활성/다른 요일에 완료 대상이 아니다', function () {
  const now = new Date('2026-09-04T04:00:00Z');
  const routine = { active: true, starts_on: '2026-09-04', weekdays: [5] };
  assert.equal(routineDue(routine, now), true);
  assert.equal(routineDue({ ...routine, starts_on: '2026-09-05' }, now), false);
  assert.equal(routineDue({ ...routine, weekdays: [6] }, now), false);
  assert.equal(routineDue({ ...routine, active: false }, now), false);
});
test('실제 달력에 없는 날짜와 윤년 오류를 거부한다', function () {
  assert.equal(dateOnly.safeParse('2026-02-29').success, false);
  assert.equal(dateOnly.safeParse('2026-04-31').success, false);
  assert.equal(dateOnly.safeParse('2028-02-29').success, true);
});
test('일정은 한국 시간을 UTC로 변환하고 역전/동일 시간을 거부한다', function () {
  const form = new FormData();
  Object.entries({ title: '자정을 넘는 일정', starts_at: '2026-09-04T23:30', ends_at: '2026-09-05T00:30', location: '', description: '' }).forEach(function ([k,v]) { form.set(k,v); });
  assert.deepEqual(parseItem('schedule', form), { title: '자정을 넘는 일정', starts_at: '2026-09-04T14:30:00.000Z', ends_at: '2026-09-04T15:30:00.000Z', location: '', description: '' });
  form.set('ends_at', '2026-09-04T23:30');
  assert.throws(function () { parseItem('schedule', form); });
  form.set('starts_at', '2026-09-04T24:30');
  assert.throws(function () { parseItem('schedule', form); });
});
test('북마크에서 스크립트/파일/data URL을 차단한다', function () {
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'ftp://example.com']) assert.equal(bookmarkUrl.safeParse(url).success, false);
  assert.equal(bookmarkUrl.safeParse('https://example.com/path?q=a').success, true);
});
test('위젯 중복/누락/알 수 없는 키를 거부하며 전체 숨김은 허용한다', function () {
  assert.equal(widgetSchema.safeParse(defaultWidgets.map(function (w) { return { ...w, visible: false }; })).success, true);
  assert.equal(widgetSchema.safeParse(defaultWidgets.slice(1)).success, false);
  assert.equal(widgetSchema.safeParse([...defaultWidgets.slice(0, 4), defaultWidgets[0]]).success, false);
  assert.equal(widgetSchema.safeParse([...defaultWidgets.slice(0, 4), { key: 'weather', visible: true }]).success, false);
});
