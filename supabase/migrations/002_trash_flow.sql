-- ============================================================
-- CANDOLER — Migration 002: Add deleted_at to egg_scans for Trash flow
-- Run this migration in Supabase SQL Editor.
-- ============================================================

alter table public.egg_scans
    add column if not exists deleted_at timestamptz default null;

-- Index on deleted_at for fast filtering of active/archived/trashed items
create index if not exists egg_scans_deleted_at_idx
    on public.egg_scans (deleted_at);
