-- ============================================================================
-- Migration: Add exercise_details to workout_plan_exercises
-- ============================================================================
-- Purpose: Enable storing exercise description/details in snapshot for imported plans
--          This allows preserving exercise description when importing from JSON
--          and passing it when creating exercises from snapshots.
--
-- Changes:
--   - Add exercise_details column to workout_plan_exercises (nullable TEXT)
--   - This field stores the description/details from JSON import (exercise_description)
--   - When creating exercise from snapshot, this value is passed as 'details' field
--
-- Dependencies:
--   - 20260126154730_add_snapshot_to_workout_plan_exercises.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD exercise_details COLUMN
-- ----------------------------------------------------------------------------

-- Add exercise_details: snapshot of exercise description/details (optional)
alter table workout_plan_exercises
    add column if not exists exercise_details text;

-- ----------------------------------------------------------------------------
-- 2. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_plan_exercises.exercise_details is 
    'Opis ćwiczenia (snapshot). Opcjonalne pole przechowujące opis z importu JSON (exercise_description). Przekazywane jako details przy tworzeniu ćwiczenia z snapshotu.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
