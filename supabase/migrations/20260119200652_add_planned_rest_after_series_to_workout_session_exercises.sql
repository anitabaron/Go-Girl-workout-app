-- ============================================================================
-- Migration: Add planned_rest_after_series_seconds to workout_session_exercises table
-- ============================================================================
-- Purpose: Add optional field for rest after series in workout session exercises
--
-- Changes:
--   - Add planned_rest_after_series_seconds column to workout_session_exercises table
--
-- Dependencies:
--   - 20260108120003_create_workout_sessions_tables.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: planned_rest_after_series_seconds
-- ----------------------------------------------------------------------------
-- Optional field for rest after series in seconds
-- Complements planned_rest_seconds (rest between sets)
-- This value is copied from workout_plan_exercises.planned_rest_after_series_seconds
-- or from exercises.rest_after_series_seconds when creating a session
alter table workout_session_exercises
    add column planned_rest_after_series_seconds integer
    check (planned_rest_after_series_seconds is null or planned_rest_after_series_seconds >= 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
