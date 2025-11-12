-- Daily Quests persistence (per user, per day, per quest)
-- Run this in Supabase SQL editor

create table if not exists public.user_daily_quest_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_date date not null,
  quest_id text not null,
  progress integer not null default 0,
  target integer not null default 1,
  completed boolean not null default false,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_date, quest_id)
);

alter table public.user_daily_quest_progress enable row level security;

-- RLS: users can only see and modify their own rows
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_daily_quest_progress' and policyname = 'Allow select own daily quest progress'
  ) then
    create policy "Allow select own daily quest progress"
      on public.user_daily_quest_progress
      for select
      using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_daily_quest_progress' and policyname = 'Allow insert own daily quest progress'
  ) then
    create policy "Allow insert own daily quest progress"
      on public.user_daily_quest_progress
      for insert
      with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_daily_quest_progress' and policyname = 'Allow update own daily quest progress'
  ) then
    create policy "Allow update own daily quest progress"
      on public.user_daily_quest_progress
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_user_daily_quest_progress_updated_at on public.user_daily_quest_progress;
create trigger trg_user_daily_quest_progress_updated_at
before update on public.user_daily_quest_progress
for each row
execute function public.set_updated_at();





