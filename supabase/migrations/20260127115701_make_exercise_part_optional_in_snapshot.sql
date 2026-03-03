-- ============================================================================
-- Migration: Make exercise_part Optional in Snapshot
-- ============================================================================
-- Purpose: Update constraint to make exercise_part optional in snapshot fields.
--          Snapshot now only requires exercise_title.
--          exercise_type and exercise_part are both optional.
--
-- Changes:
--   - Drop old constraint that requires exercise_part
--   - Add new constraint that only requires exercise_title
--   - Update column comments to reflect optionality
--   - Update snapshot_id generation logic (group by title only)
--
-- Dependencies:
--   - 20260127104622_make_exercise_type_optional_in_snapshot.sql
--   - 20260127113619_add_snapshot_id_to_workout_plan_exercises.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP OLD CONSTRAINT
-- ----------------------------------------------------------------------------

alter table workout_plan_exercises
    drop constraint if exists workout_plan_exercises_snapshot_check;

-- ----------------------------------------------------------------------------
-- 2. ADD NEW CONSTRAINT: SNAPSHOT REQUIRED IF exercise_id IS NULL
--    (only exercise_title is required, exercise_type and exercise_part are optional)
-- ----------------------------------------------------------------------------

-- Constraint: if exercise_id IS NULL, snapshot must have exercise_title
-- exercise_type and exercise_part are optional
alter table workout_plan_exercises
    add constraint workout_plan_exercises_snapshot_check check (
        (exercise_id is not null) or 
        (exercise_title is not null)
    );

-- ----------------------------------------------------------------------------
-- 3. UPDATE COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_plan_exercises.exercise_title is 
    'Tytuł ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';

comment on column workout_plan_exercises.exercise_type is 
    'Typ ćwiczenia (snapshot). Opcjonalny - jeśli nie podany, użyty zostanie section_type.';

comment on column workout_plan_exercises.exercise_part is 
    'Partia mięśniowa (snapshot). Opcjonalna - jeśli nie podana, użyty zostanie part z planu lub domyślna wartość.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
