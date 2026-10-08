-- ============================================================
-- CANDOLER — Supabase schema
-- Run this file in the Supabase SQL editor (Studio -> SQL Editor).
-- It is idempotent (safe to re-run).
-- ============================================================

-- ---------- egg_scans table (required columns) ----------
create table if not exists public.egg_scans (
    id              bigint generated always as identity primary key,
    user_id         uuid not null references auth.users (id) on delete cascade,
    image_url       text,
    predicted_day   text,
    stage           text,
    confidence      double precision,
    top_predictions jsonb,
    low_confidence  boolean not null default false,
    warning         text,
    is_archived     boolean not null default false,
    created_at      timestamptz not null default now()
);

-- ---------- required indexes ----------
create index if not exists egg_scans_created_at_idx
    on public.egg_scans (created_at);

create index if not exists egg_scans_predicted_day_idx
    on public.egg_scans (predicted_day);

-- ---------- Row Level Security (required) ----------
alter table public.egg_scans enable row level security;

drop policy if exists "Users select own scans" on public.egg_scans;
create policy "Users select own scans" on public.egg_scans
    for select using (auth.uid() = user_id);

drop policy if exists "Users insert own scans" on public.egg_scans;
create policy "Users insert own scans" on public.egg_scans
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own scans" on public.egg_scans;
create policy "Users update own scans" on public.egg_scans
    for update using (auth.uid() = user_id);

drop policy if exists "Users delete own scans" on public.egg_scans;
create policy "Users delete own scans" on public.egg_scans
    for delete using (auth.uid() = user_id);

-- ---------- Storage bucket: egg-images ----------
-- Images are stored as: egg-images/<Day_N | unassigned>/<filename>.jpg
-- Public so the React app can render image_url directly.
insert into storage.buckets (id, name, public)
values ('egg-images', 'egg-images', true)
on conflict (id) do update set public = excluded.public;
