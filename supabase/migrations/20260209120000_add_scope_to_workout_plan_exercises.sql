-- Add scope columns to workout_plan_exercises for repeatable exercise blocks (scope).
-- A scope: multiple exercises with same scope_id and section_order, repeated scope_repeat_count times.

ALTER TABLE workout_plan_exercises
  ADD COLUMN IF NOT EXISTS scope_id UUID NULL,
  ADD COLUMN IF NOT EXISTS in_scope_nr INTEGER NULL,
  ADD COLUMN IF NOT EXISTS scope_repeat_count INTEGER NULL;

-- in_scope_nr: order within scope (1, 2, 3...). NULL = exercise not in a scope.
ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_in_scope_nr_check
  CHECK (in_scope_nr IS NULL OR in_scope_nr > 0);

-- scope_repeat_count: how many times to repeat the scope. NULL = not in scope.
ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_scope_repeat_count_check
  CHECK (scope_repeat_count IS NULL OR scope_repeat_count >= 1);

-- Replace unique constraint: allow multiple rows per (plan_id, section_type, section_order)
-- when they differ by in_scope_nr (one slot = single exercise with in_scope_nr NULL, or scope with in_scope_nr 1,2,3...).
-- In PostgreSQL, UNIQUE treats NULLs as distinct, so only one row per slot can have in_scope_nr NULL.
ALTER TABLE workout_plan_exercises
  DROP CONSTRAINT IF EXISTS workout_plan_exercises_unique_order;

ALTER TABLE workout_plan_exercises
  ADD CONSTRAINT workout_plan_exercises_unique_order
  UNIQUE (plan_id, section_type, section_order, in_scope_nr);

COMMENT ON COLUMN workout_plan_exercises.scope_id IS 'Shared id for exercises in one scope block; NULL for single exercises.';
COMMENT ON COLUMN workout_plan_exercises.in_scope_nr IS 'Order within scope (1,2,3...); NULL when not in a scope.';
COMMENT ON COLUMN workout_plan_exercises.scope_repeat_count IS 'How many times to repeat this scope; NULL when not in a scope.';
