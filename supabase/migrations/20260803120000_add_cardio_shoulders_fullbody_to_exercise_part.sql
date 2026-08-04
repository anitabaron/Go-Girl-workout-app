-- Add 'Cardio', 'Shoulders', 'Full Body' to exercise_part enum.
-- Requested by użytkowniczkę: importowany JSON treningu zawierał partie mięśniowe
-- spoza dotychczasowego zestawu (Legs, Core, Back, Arms, Chest, Glutes).
-- Używane w: workout_plans.part, exercises.part, workout_plan_exercises.exercise_part,
--            workout_session_exercises.exercise_part_at_time oraz w imporcie JSON (part, exercise_part).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'exercise_part'
      AND e.enumlabel = 'Cardio'
  ) THEN
    ALTER TYPE exercise_part ADD VALUE 'Cardio';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'exercise_part'
      AND e.enumlabel = 'Shoulders'
  ) THEN
    ALTER TYPE exercise_part ADD VALUE 'Shoulders';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'exercise_part'
      AND e.enumlabel = 'Full Body'
  ) THEN
    ALTER TYPE exercise_part ADD VALUE 'Full Body';
  END IF;
END $$;
