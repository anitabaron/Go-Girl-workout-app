-- ============================================================================
-- Migration: Fix snapshot population on exercise delete
-- ============================================================================
-- Purpose: When an exercise is deleted, the FK constraint ON DELETE SET NULL
--          tries to set exercise_id to NULL in workout_plan_exercises.
--          However, the check constraint requires that if exercise_id IS NULL,
--          then snapshot fields (exercise_title, exercise_type, exercise_part)
--          must be filled. This trigger ensures snapshot fields are populated
--          before the FK constraint sets exercise_id to NULL.
--
-- Changes:
--   - Add trigger function that populates snapshot fields before exercise deletion
--   - Add trigger on exercises table that fires BEFORE DELETE
--
-- Dependencies:
--   - 20260126154730_add_snapshot_to_workout_plan_exercises.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX EXISTING DATA
-- ----------------------------------------------------------------------------

-- Fix any existing rows where exercise_id is not NULL but snapshot fields are NULL
-- This ensures all rows are in a valid state before we add the trigger
UPDATE workout_plan_exercises wpe
SET
  exercise_title = COALESCE(wpe.exercise_title, e.title),
  exercise_type = COALESCE(wpe.exercise_type, e.type),
  exercise_part = COALESCE(wpe.exercise_part, e.part)
FROM exercises e
WHERE wpe.exercise_id = e.id
  AND (
    wpe.exercise_title IS NULL OR
    wpe.exercise_type IS NULL OR
    wpe.exercise_part IS NULL
  );

-- ----------------------------------------------------------------------------
-- 2. CREATE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------

-- Function that populates snapshot fields in workout_plan_exercises
-- before an exercise is deleted. This ensures the check constraint is satisfied
-- when the FK constraint sets exercise_id to NULL.
CREATE OR REPLACE FUNCTION populate_snapshot_before_exercise_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all workout_plan_exercises rows that reference this exercise
  -- Populate snapshot fields from the exercise being deleted
  -- Only update rows where snapshot fields are not already filled
  UPDATE workout_plan_exercises
  SET
    exercise_title = COALESCE(exercise_title, OLD.title),
    exercise_type = COALESCE(exercise_type, OLD.type),
    exercise_part = COALESCE(exercise_part, OLD.part)
  WHERE exercise_id = OLD.id
    AND (
      exercise_title IS NULL OR
      exercise_type IS NULL OR
      exercise_part IS NULL
    );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. CREATE TRIGGER
-- ----------------------------------------------------------------------------

-- Drop if exists (idempotent - remote DB may already have it)
DROP TRIGGER IF EXISTS exercises_populate_snapshot_before_delete ON exercises;

-- Trigger that fires BEFORE DELETE on exercises table
-- This ensures snapshot fields are populated before the FK constraint
-- sets exercise_id to NULL
CREATE TRIGGER exercises_populate_snapshot_before_delete
  BEFORE DELETE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION populate_snapshot_before_exercise_delete();

-- ----------------------------------------------------------------------------
-- 4. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION populate_snapshot_before_exercise_delete() IS 
  'Populates snapshot fields (exercise_title, exercise_type, exercise_part) in workout_plan_exercises before an exercise is deleted. This ensures the check constraint is satisfied when the FK constraint sets exercise_id to NULL.';

COMMENT ON TRIGGER exercises_populate_snapshot_before_delete ON exercises IS 
  'Trigger that populates snapshot fields in workout_plan_exercises before an exercise is deleted. Fires BEFORE DELETE to ensure snapshot is populated before FK constraint sets exercise_id to NULL.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
