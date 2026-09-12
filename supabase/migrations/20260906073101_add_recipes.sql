create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  source_url text check (source_url is null or (length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')),
  source_type text not null default 'manual' check (source_type in ('manual','webpage','video')),
  servings text not null default '' check (length(servings) <= 80),
  prep_minutes integer check (prep_minutes is null or prep_minutes between 0 and 10080),
  cook_minutes integer check (cook_minutes is null or cook_minutes between 0 and 10080),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) <= 200),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 100),
  tips text not null default '' check (length(tips) <= 5000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  analysis_status text not null default 'manual' check (analysis_status in ('manual','extracted','needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_updated on public.recipes(user_id, updated_at desc);
create trigger touch_updated_at before update on public.recipes
for each row execute function public.touch_updated_at();

alter table public.recipes enable row level security;
revoke all on public.recipes from anon;
grant select, insert, update, delete on public.recipes to authenticated;
create policy own_select on public.recipes for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.recipes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.recipes for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.recipes for delete to authenticated using ((select auth.uid()) = user_id);
