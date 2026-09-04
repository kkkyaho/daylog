begin;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create function public.valid_weekdays(values_ smallint[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(values_) between 1 and 7
    and values_ <@ array[0,1,2,3,4,5,6]::smallint[]
    and array_position(values_, null) is null
    and cardinality(values_) = (select count(distinct v) from unnest(values_) v), false);
$$;

create function public.valid_widgets(value_ jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare entry jsonb; keys_ text[] := '{}';
begin
  if jsonb_typeof(value_) <> 'array' or jsonb_array_length(value_) <> 5 then return false; end if;
  for entry in select * from jsonb_array_elements(value_) loop
    if jsonb_typeof(entry) <> 'object' then return false; end if;
    if not (entry ? 'key' and entry ? 'visible') then return false; end if;
    if jsonb_typeof(entry->'visible') <> 'boolean' or jsonb_typeof(entry->'key') <> 'string' then return false; end if;
    if (select count(*) from jsonb_object_keys(entry)) <> 2 then return false; end if;
    if not (entry->>'key' = any(array['schedule','todos','routines','memos','bookmarks'])) then return false; end if;
    if entry->>'key' = any(keys_) then return false; end if;
    keys_ := array_append(keys_, entry->>'key');
  end loop;
  return true;
end;
$$;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null, ends_at timestamptz not null,
  location text not null default '' check (length(location) <= 200),
  description text not null default '' check (length(description) <= 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_user_start on public.events(user_id, starts_at);
create index events_user_end on public.events(user_id, ends_at);

create table public.todos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120), due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index todos_user_status_date on public.todos(user_id, completed, due_date);

create table public.routines (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  weekdays smallint[] not null check (public.valid_weekdays(weekdays)),
  starts_on date not null default ((now() at time zone 'Asia/Seoul')::date), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index routines_user_active on public.routines(user_id, active);

create table public.routine_logs (
  routine_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null, created_at timestamptz not null default now(),
  primary key (routine_id, completed_on),
  foreign key (routine_id, user_id) references public.routines(id, user_id) on delete cascade
);
create index routine_logs_user_day on public.routine_logs(user_id, completed_on);

create table public.memos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null default '' check (length(body) <= 20000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index memos_user_updated on public.memos(user_id, updated_at desc);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  url text not null check (length(url) <= 2048 and url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index bookmarks_user_created on public.bookmarks(user_id, created_at desc);

create table public.dashboard_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  widgets jsonb not null check (public.valid_widgets(widgets)),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['events','todos','routines','memos','bookmarks','dashboard_settings'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
  foreach t in array array['events','todos','routines','routine_logs','memos','bookmarks','dashboard_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy own_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy own_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    if t <> 'routine_logs' then
      execute format('create policy own_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
      execute format('create policy own_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    end if;
  end loop;
end;
$$;

create policy own_today_insert on public.routine_logs for insert to authenticated with check (
  (select auth.uid()) = user_id
  and completed_on = (now() at time zone 'Asia/Seoul')::date
  and exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())
    and r.active and r.starts_on <= completed_on and extract(dow from completed_on)::smallint = any(r.weekdays))
);
create policy own_today_update on public.routine_logs for update to authenticated
using ((select auth.uid()) = user_id and completed_on = (now() at time zone 'Asia/Seoul')::date)
with check ((select auth.uid()) = user_id and completed_on = (now() at time zone 'Asia/Seoul')::date
  and exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid())
    and r.active and r.starts_on <= completed_on and extract(dow from completed_on)::smallint = any(r.weekdays)));

commit;
