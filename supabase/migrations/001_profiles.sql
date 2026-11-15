-- ============================================================
-- Migration: 001_profiles.sql
-- Creates the profiles table, trigger-based onboarding,
-- RLS policies, and backfills existing auth.users rows.
-- Run this manually in the Supabase SQL Editor.
-- ============================================================

-- ── 1. Profiles Table ───────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

-- ── 2. Row-Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Authenticated users may read only their own row
create policy "users_select_own_profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Authenticated users may update only their own row
create policy "users_update_own_profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No client-side insert or delete — handled by trigger / service role only

-- ── 3. Auto-Provisioning Trigger ────────────────────────────
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop existing trigger first to allow re-runs
drop trigger if exists tr_create_profile_after_auth_insert on auth.users;

create trigger tr_create_profile_after_auth_insert
  after insert on auth.users
  for each row
  execute function public.create_profile_for_auth_user();

-- ── 4. Backfill Existing Users ───────────────────────────────
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
