-- ============================================================================
-- Migration: Create Enums and Helper Functions
-- ============================================================================
-- Purpose: Create foundational enum types and helper functions used across
--          the entire schema
--
-- Enums created:
--   - exercise_type: Warm-up, Main Workout, Cool-down
--   - exercise_part: Legs, Core, Back, Arms, Chest
--   - workout_session_status: in_progress, completed
--   - pr_metric_type: total_reps, max_duration, max_weight
--   - ai_request_type: generate, optimize
--
-- Functions created:
--   - update_updated_at_column(): Auto-update updated_at timestamp
--
-- Dependencies: None (this is the first migration)
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
-- These enums provide type safety and data integrity for categorical values

-- Exercise type categorizes exercises into warm-up, main workout, or cool-down phases
-- Used in: exercises.type, workout_plan_exercises.section_type,
--          workout_session_exercises.exercise_type_at_time
create type exercise_type as enum ('Warm-up', 'Main Workout', 'Cool-down');

-- Exercise part identifies which muscle group the exercise targets
-- Used in: exercises.part, workout_plans.part,
--          workout_session_exercises.exercise_part_at_time
create type exercise_part as enum ('Legs', 'Core', 'Back', 'Arms', 'Chest');

-- Workout session status tracks whether a session is active or finished
-- Used in: workout_sessions.status
-- Note: Only one 'in_progress' session per user is allowed (enforced by partial unique index)
create type workout_session_status as enum ('in_progress', 'completed');

-- PR metric type defines what kind of personal record is being tracked
-- Used in: personal_records.metric_type
-- Values:
--   - total_reps: Sum of all reps across all sessions for an exercise
--   - max_duration: Maximum single-set duration (in seconds)
--   - max_weight: Maximum single-set weight (in kg)
create type pr_metric_type as enum ('total_reps', 'max_duration', 'max_weight');

-- AI request type categorizes AI interactions
-- Used in: ai_requests.request_type
-- Values:
--   - generate: AI generates a new workout plan
--   - optimize: AI optimizes an existing workout plan
create type ai_request_type as enum ('generate', 'optimize');

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- Function: update_updated_at_column
-- Purpose: Automatically updates the updated_at timestamp when a row is modified
-- Used by: triggers on tables with updated_at column
--   - exercises
--   - workout_plans
--   - workout_session_exercises
--   - workout_session_sets
--   - personal_records
--   - ai_usage
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
