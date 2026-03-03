-- ============================================================================
-- Migration: Add external_workouts table
-- ============================================================================
-- Purpose: Store workouts performed outside app workout plans/sessions.
--
-- Creates:
--   - enums: external_workout_sport_type, external_workout_source
--   - table: external_workouts
--   - indexes, constraints, RLS policies, updated_at trigger
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'external_workout_sport_type') then
    create type external_workout_sport_type as enum ('pole_dance', 'calisthenics', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'external_workout_source') then
    create type external_workout_source as enum ('manual', 'garmin', 'apple_health');
  end if;
end $$;

create table if not exists external_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  sport_type external_workout_sport_type not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  calories integer check (calories is null or calories >= 0),
  hr_avg integer check (hr_avg is null or hr_avg between 1 and 260),
  hr_max integer check (hr_max is null or hr_max between 1 and 260),
  intensity_rpe integer check (intensity_rpe is null or intensity_rpe between 1 and 10),
  notes text,
  source external_workout_source not null default 'manual',
  external_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_workouts_hr_consistency
    check (hr_avg is null or hr_max is null or hr_max >= hr_avg)
);

create index if not exists idx_external_workouts_user_id_started_at
  on external_workouts(user_id, started_at desc);

create unique index if not exists idx_external_workouts_user_source_external_id
  on external_workouts(user_id, source, external_id)
  where external_id is not null;

create trigger external_workouts_updated_at
  before update on external_workouts
  for each row
  execute function update_updated_at_column();

alter table external_workouts enable row level security;

create policy external_workouts_select_authenticated on external_workouts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy external_workouts_insert_authenticated on external_workouts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy external_workouts_update_authenticated on external_workouts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy external_workouts_delete_authenticated on external_workouts
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on table external_workouts is
  'Workouts recorded outside in-app workout plans/sessions.';

comment on column external_workouts.external_id is
  'Provider activity id (Garmin/Apple/etc.) for deduplication.';
