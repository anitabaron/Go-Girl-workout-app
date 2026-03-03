-- ============================================================================
-- Migration: Add estimated_total_time_seconds to workout_plans table
-- ============================================================================
-- Purpose: Add optional field for estimated total workout time in seconds
--
-- Changes:
--   - Add estimated_total_time_seconds column to workout_plans table
--
-- Dependencies:
--   - 20260108120002_create_workout_plans_tables.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: estimated_total_time_seconds
-- ----------------------------------------------------------------------------
-- Optional field for estimated total workout time in seconds
-- Calculated as sum of estimated_set_time_seconds * planned_sets for all exercises
alter table workout_plans
    add column estimated_total_time_seconds integer
    check (estimated_total_time_seconds is null or estimated_total_time_seconds > 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
