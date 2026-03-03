-- ============================================================================
-- Migration: Allow NULL exercise_id in workout_session_exercises
-- ============================================================================
-- Purpose: Enable starting sessions from plans containing exercises without
--          exercise_id (imported from JSON). exercise_id can be NULL, but
--          snapshot fields are always required.
--
-- Changes:
--   - Make exercise_id nullable (ON DELETE SET NULL instead of RESTRICT)
--   - Add constraint: snapshot fields are always required (even with NULL exercise_id)
--   - Update FK constraint to ON DELETE SET NULL
--
-- Dependencies:
--   - 20260108120003_create_workout_sessions_tables.sql (workout_session_exercises table)
--   - 20260108120001_create_exercises_table.sql (exercises table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MAKE exercise_id NULLABLE
-- ----------------------------------------------------------------------------

-- Drop NOT NULL constraint on exercise_id
alter table workout_session_exercises
    alter column exercise_id drop not null;

-- ----------------------------------------------------------------------------
-- 2. UPDATE FOREIGN KEY CONSTRAINT
-- ----------------------------------------------------------------------------

-- Drop old FK constraint (ON DELETE RESTRICT)
alter table workout_session_exercises
    drop constraint if exists workout_session_exercises_exercise_id_fkey;

-- Add new FK constraint with ON DELETE SET NULL
-- This preserves session history even if exercise is deleted
alter table workout_session_exercises
    add constraint workout_session_exercises_exercise_id_fkey
    foreign key (exercise_id)
    references exercises(id)
    on delete set null;

-- ----------------------------------------------------------------------------
-- 3. ADD CONSTRAINT: SNAPSHOT ALWAYS REQUIRED
-- ----------------------------------------------------------------------------

-- Constraint: snapshot fields are always required (even with NULL exercise_id)
-- This ensures session history is always complete
alter table workout_session_exercises
    add constraint workout_session_exercises_snapshot_check check (
        exercise_title_at_time is not null and 
        exercise_type_at_time is not null and 
        exercise_part_at_time is not null
    );

-- ----------------------------------------------------------------------------
-- 4. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_session_exercises.exercise_id is 
    'ID ćwiczenia z biblioteki użytkownika. Może być NULL dla ćwiczeń z planu bez exercise_id.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
