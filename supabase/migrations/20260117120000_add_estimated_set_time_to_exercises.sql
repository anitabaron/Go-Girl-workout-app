-- ============================================================================
-- Migration: Add estimated_set_time_seconds to exercises table
-- ============================================================================
-- Purpose: Add optional field for estimated time per set in seconds
--
-- Changes:
--   - Add estimated_set_time_seconds column to exercises table
--
-- Dependencies:
--   - 20260108120001_create_exercises_table.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: estimated_set_time_seconds
-- ----------------------------------------------------------------------------
-- Optional field for estimated time per set in seconds
-- Allows users to specify how long a single set should take
alter table exercises
    add column estimated_set_time_seconds integer
    check (estimated_set_time_seconds is null or estimated_set_time_seconds > 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
