-- Add 'Glutes' to exercise_part enum.
-- Używane w: workout_plans.part, exercises.part, workout_plan_exercises.exercise_part,
--            workout_session_exercises.exercise_part_at_time oraz w imporcie JSON (part, exercise_part).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'exercise_part'
      AND e.enumlabel = 'Glutes'
  ) THEN
    ALTER TYPE exercise_part ADD VALUE 'Glutes';
  END IF;
END $$;
