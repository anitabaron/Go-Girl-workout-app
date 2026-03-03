-- ============================================================================
-- Migration: Make exercise_type Optional in Snapshot
-- ============================================================================
-- Purpose: Update constraint to make exercise_type optional in snapshot fields.
--          Snapshot now only requires exercise_title and exercise_part.
--
-- Changes:
--   - Drop old constraint that requires exercise_type
--   - Add new constraint that only requires exercise_title and exercise_part
--   - Update column comments to reflect optionality
--
-- Dependencies:
--   - 20260126154730_add_snapshot_to_workout_plan_exercises.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP OLD CONSTRAINT
-- ----------------------------------------------------------------------------

alter table workout_plan_exercises
    drop constraint if exists workout_plan_exercises_snapshot_check;

-- ----------------------------------------------------------------------------
-- 2. ADD NEW CONSTRAINT: SNAPSHOT REQUIRED IF exercise_id IS NULL
--    (exercise_type is now optional)
-- ----------------------------------------------------------------------------

-- Constraint: if exercise_id IS NULL, snapshot must have exercise_title and exercise_part
-- exercise_type is optional
alter table workout_plan_exercises
    add constraint workout_plan_exercises_snapshot_check check (
        (exercise_id is not null) or 
        (exercise_title is not null and exercise_part is not null)
    );

-- ----------------------------------------------------------------------------
-- 3. UPDATE COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_plan_exercises.exercise_title is 
    'Tytuł ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';

comment on column workout_plan_exercises.exercise_type is 
    'Typ ćwiczenia (snapshot). Opcjonalny - jeśli nie podany, użyty zostanie section_type.';

comment on column workout_plan_exercises.exercise_part is 
    'Partia mięśniowa (snapshot). Wymagany jeśli exercise_id IS NULL.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
