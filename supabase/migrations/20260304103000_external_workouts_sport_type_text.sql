-- ============================================================================
-- Migration: external_workouts.sport_type -> text
-- ============================================================================
-- Purpose:
--   Allow custom sport types entered by user while keeping existing data.
-- ============================================================================

alter table external_workouts
  alter column sport_type type text using sport_type::text;

alter table external_workouts
  add constraint external_workouts_sport_type_not_empty
  check (length(btrim(sport_type)) > 0);

do $$
begin
  if exists (select 1 from pg_type where typname = 'external_workout_sport_type') then
    drop type external_workout_sport_type;
  end if;
end $$;
