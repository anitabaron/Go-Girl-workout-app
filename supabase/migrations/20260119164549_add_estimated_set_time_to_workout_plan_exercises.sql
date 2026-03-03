-- ============================================================================
-- Migration: Add estimated_set_time_seconds to workout_plan_exercises table
-- ============================================================================
-- Purpose: Add optional field for estimated set time override in workout plan exercises
--
-- Changes:
--   - Add estimated_set_time_seconds column to workout_plan_exercises table
--   - Allows overriding the default estimated_set_time_seconds from exercises table
--   - If NULL, the value from exercises.estimated_set_time_seconds is used
--
-- Dependencies:
--   - 20260108120002_create_workout_plans_tables.sql
--   - 20260117120000_add_estimated_set_time_to_exercises.sql (if exists)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: estimated_set_time_seconds
-- ----------------------------------------------------------------------------
-- Optional field for estimated set time in seconds
-- Allows plan-specific override of exercise default estimated_set_time_seconds
-- If NULL, falls back to exercises.estimated_set_time_seconds
alter table workout_plan_exercises
    add column estimated_set_time_seconds integer
    check (estimated_set_time_seconds is null or estimated_set_time_seconds > 0);

-- ----------------------------------------------------------------------------
-- 2. ADD COMMENT
-- ----------------------------------------------------------------------------
comment on column workout_plan_exercises.estimated_set_time_seconds is 
    'Estimated time per set in seconds. If NULL, uses the value from exercises.estimated_set_time_seconds.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
