create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  account_email text not null default '',
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  sync_cursor text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.external_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  external_id text not null,
  calendar_id text not null default 'primary',
  title text not null check (char_length(title) between 1 and 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  location text not null default '',
  description text not null default '',
  web_url text,
  meeting_url text,
  organizer text not null default '',
  status text not null default 'confirmed',
  updated_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

create index external_events_user_starts_idx on public.external_events(user_id, starts_at);
alter table public.calendar_connections enable row level security;
alter table public.external_events enable row level security;

create policy calendar_connections_owner_all on public.calendar_connections
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy external_events_owner_all on public.external_events
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.calendar_connections to authenticated;
grant select, insert, update, delete on public.external_events to authenticated;
revoke all on public.calendar_connections from anon;
revoke all on public.external_events from anon;

create trigger calendar_connections_updated_at before update on public.calendar_connections
  for each row execute function public.touch_updated_at();
