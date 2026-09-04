import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('실제 migration의 제약과 A/B 사용자 RLS를 PostgreSQL 엔진에서 검증한다', async function () {
  const db = new PGlite();
  try {
    // Local engine only: emulate Supabase's auth schema and database roles.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');`);
    await db.exec(await readFile(new URL('../supabase/migrations/001_initial.sql', import.meta.url), 'utf8'));
    const todayResult = await db.query<{ today: string }>("select to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD') as today");
    const today = todayResult.rows[0].today;
    async function user(id: 'a' | 'b') {
      const uuid = id === 'a' ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await db.exec('reset role; set role authenticated;');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uuid]);
      return uuid;
    }
    const a = await user('a');
    const fixtures = {
      events: `insert into public.events(user_id,title,starts_at,ends_at) values ('${a}','일정',now(),now()+interval '1 hour') returning id`,
      todos: `insert into public.todos(user_id,title) values ('${a}','할 일') returning id`,
      routines: `insert into public.routines(user_id,title,weekdays) values ('${a}','루틴',array[0,1,2,3,4,5,6]::smallint[]) returning id`,
      memos: `insert into public.memos(user_id,title,body) values ('${a}','메모','내용') returning id`,
      bookmarks: `insert into public.bookmarks(user_id,title,url) values ('${a}','링크','https://example.com') returning id`
    };
    const ids: Record<string, string> = {};
    for (const [table, query] of Object.entries(fixtures)) {
      const inserted = await db.query<{ id: string }>(query);
      ids[table] = inserted.rows[0].id;
      const updated = await db.query(`update public.${table} set title='수정됨' returning id`);
      assert.equal(updated.rows.length, 1, table + ' own update');
    }
    const widgets = JSON.stringify(['schedule','todos','routines','memos','bookmarks'].map(function (key) { return { key, visible: true }; }));
    await db.query('insert into public.dashboard_settings(user_id,widgets) values ($1,$2)', [a, widgets]);
    await db.query('insert into public.routine_logs(routine_id,user_id,completed_on) values ($1,$2,$3) on conflict do nothing', [ids.routines, a, today]);
    await db.query('insert into public.routine_logs(routine_id,user_id,completed_on) values ($1,$2,$3) on conflict do nothing', [ids.routines, a, today]);
    assert.equal((await db.query('select * from public.routine_logs')).rows.length, 1, '중복 완료 방지');
    await assert.rejects(db.query('insert into public.routine_logs(routine_id,user_id,completed_on) values ($1,$2,$3)', [ids.routines, a, '2000-01-01']));
    await assert.rejects(db.query("update public.routines set weekdays=array[1,1]::smallint[]"));
    await assert.rejects(db.query("update public.events set ends_at=starts_at"));
    await assert.rejects(db.query("update public.bookmarks set url='javascript:alert(1)'"));
    await assert.rejects(db.query("update public.dashboard_settings set widgets='[]'::jsonb"));
    await assert.rejects(db.query("update public.todos set user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'"));
    const b = await user('b');
    for (const table of [...Object.keys(fixtures), 'routine_logs', 'dashboard_settings']) {
      assert.equal((await db.query(`select * from public.${table}`)).rows.length, 0, table + ' B cannot read A');
      assert.equal((await db.query(`delete from public.${table} returning user_id`)).rows.length, 0, table + ' B cannot delete A');
      assert.equal((await db.query(`update public.${table} set user_id='${b}' returning user_id`)).rows.length, 0, table + ' B cannot update A');
    }
    await assert.rejects(db.query('insert into public.todos(user_id,title) values ($1,$2)', [a, '타인 소유로 생성']));
    await assert.rejects(db.query('insert into public.routine_logs(routine_id,user_id,completed_on) values ($1,$2,$3)', [ids.routines, b, today]));
    await assert.rejects(db.query('insert into public.dashboard_settings(user_id,widgets) values ($1,$2)', [a, widgets]));
    await db.exec('reset role; set role anon;');
    for (const table of [...Object.keys(fixtures), 'routine_logs', 'dashboard_settings']) await assert.rejects(db.query(`select * from public.${table}`), table + ' anon blocked');
    await user('a');
    await db.query('delete from public.routines where id=$1', [ids.routines]);
    assert.equal((await db.query('select * from public.routine_logs')).rows.length, 0, '루틴 삭제 시 이력 cascade');
  } finally { await db.close(); }
});
