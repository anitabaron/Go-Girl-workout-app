-- ============================================================================
-- Migration: Add exercise_is_unilateral to workout_plan_exercises
-- ============================================================================
-- Purpose: Store unilateral flag for snapshot exercises (no exercise_id).
--          For exercises from library, value is read from exercises.is_unilateral
--          at query time; this column is used only for snapshots (import/JSON).
--
-- Changes:
--   - workout_plan_exercises: add exercise_is_unilateral boolean null
--
-- Dependencies:
--   - 20260202120000_add_unilateral_and_type_part_arrays.sql (exercises.is_unilateral)
-- ============================================================================

alter table workout_plan_exercises
  add column if not exists exercise_is_unilateral boolean null;

comment on column workout_plan_exercises.exercise_is_unilateral is
  'Dla snapshotów (exercise_id IS NULL): czy ćwiczenie jest unilateralne. Dla ćwiczeń z biblioteki wartość jest brana z exercises.is_unilateral.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
