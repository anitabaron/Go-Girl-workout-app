-- ============================================================================
-- Migration: Rename section_position to section_order in workout_plan_exercises
-- ============================================================================
-- Purpose: Rename 'section_position' column to 'section_order' for consistency
--          with 'order' in workout_session_exercises. Both represent the order
--          of exercises (local within section vs global in session).
--
-- Changes:
--   - Rename column: section_position -> section_order
--   - Rename constraint: workout_plan_exercises_unique_position -> workout_plan_exercises_unique_order
--   - Rename index: idx_workout_plan_exercises_plan_section -> idx_workout_plan_exercises_plan_section_order
--
-- Dependencies:
--   - 20260108120002_create_workout_plans_tables.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RENAME COLUMN: section_position -> section_order
-- ----------------------------------------------------------------------------
alter table workout_plan_exercises
    rename column section_position to section_order;

-- ----------------------------------------------------------------------------
-- 2. RENAME CONSTRAINT: unique position -> unique order
-- ----------------------------------------------------------------------------
alter table workout_plan_exercises
    rename constraint workout_plan_exercises_unique_position
    to workout_plan_exercises_unique_order;

-- ----------------------------------------------------------------------------
-- 3. DROP OLD INDEX
-- ----------------------------------------------------------------------------
drop index if exists idx_workout_plan_exercises_plan_section;

-- ----------------------------------------------------------------------------
-- 4. CREATE NEW INDEX with new column name
-- ----------------------------------------------------------------------------
create index idx_workout_plan_exercises_plan_section_order
    on workout_plan_exercises(plan_id, section_type, section_order);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
