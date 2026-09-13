create table public.issue_notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160), source_url text check (source_url is null or (length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')),
  source_type text not null default 'manual' check (source_type in ('manual','webpage','video')), occurred_on date not null default current_date,
  summary text not null check (length(btrim(summary)) between 1 and 10000), key_points jsonb not null default '[]'::jsonb check (jsonb_typeof(key_points) = 'array' and jsonb_array_length(key_points) <= 50),
  impact text not null default '' check (length(impact) <= 5000), follow_up text not null default '' check (length(follow_up) <= 5000), tags text[] not null default '{}' check (cardinality(tags) <= 20),
  analysis_status text not null default 'manual' check (analysis_status in ('manual','extracted','needs_review')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index issue_notes_user_date_idx on public.issue_notes(user_id, occurred_on desc, updated_at desc);
alter table public.issue_notes enable row level security;
create policy "issue_notes_select_own" on public.issue_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "issue_notes_insert_own" on public.issue_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "issue_notes_update_own" on public.issue_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "issue_notes_delete_own" on public.issue_notes for delete to authenticated using ((select auth.uid()) = user_id);
create trigger issue_notes_set_updated_at before update on public.issue_notes for each row execute function public.touch_updated_at();
grant select, insert, update, delete on public.issue_notes to authenticated;
