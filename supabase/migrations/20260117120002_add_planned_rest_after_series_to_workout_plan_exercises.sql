-- ============================================================================
-- Migration: Add planned_rest_after_series_seconds to workout_plan_exercises table
-- ============================================================================
-- Purpose: Add optional field for rest after series in workout plan exercises
--
-- Changes:
--   - Add planned_rest_after_series_seconds column to workout_plan_exercises table
--
-- Dependencies:
--   - 20260108120002_create_workout_plans_tables.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: planned_rest_after_series_seconds
-- ----------------------------------------------------------------------------
-- Optional field for rest after series in seconds
-- Complements planned_rest_seconds (rest between sets)
alter table workout_plan_exercises
    add column planned_rest_after_series_seconds integer
    check (planned_rest_after_series_seconds is null or planned_rest_after_series_seconds >= 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
