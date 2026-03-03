-- ============================================================================
-- Migration: Fix populate_snapshot_before_exercise_delete for types/parts arrays
-- ============================================================================
-- Purpose: exercises table now has types[] and parts[] instead of type and part.
--          Update trigger function to use OLD.types[1] and OLD.parts[1].
--
-- Dependencies:
--   - 20260202120000_add_unilateral_and_type_part_arrays.sql
--   - 20260127112348_fix_snapshot_on_exercise_delete.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_snapshot_before_exercise_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workout_plan_exercises
  SET
    exercise_title = COALESCE(exercise_title, OLD.title),
    exercise_type = COALESCE(exercise_type, OLD.types[1]),
    exercise_part = COALESCE(exercise_part, OLD.parts[1])
  WHERE exercise_id = OLD.id
    AND (
      exercise_title IS NULL OR
      exercise_type IS NULL OR
      exercise_part IS NULL
    );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
