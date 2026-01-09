-- ============================================================================
-- Migration: Create Exercises Table
-- ============================================================================
-- Purpose: Create the exercises table for user's exercise library
--
-- Table created:
--   - exercises: User exercise library with metrics validation
--
-- Features:
--   - Case-insensitive unique title per user (via generated column)
--   - XOR constraint for reps/duration (exactly one must be set)
--   - At least one rest period must be defined
--   - Full RLS with user isolation
--
-- Dependencies:
--   - 20260108120000_create_enums_and_functions.sql (exercise_type, exercise_part,
--     update_updated_at_column)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: exercises
-- ----------------------------------------------------------------------------
-- Stores all exercises created by users with their parameters
-- Each exercise belongs to exactly one user (user_id)
-- Title uniqueness is enforced per user (case-insensitive via title_normalized)
create table exercises (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    -- Generated column for case-insensitive unique title per user
    -- Normalizes: lowercase, trim whitespace, reduce multiple spaces to single
    title_normalized text not null generated always as (
        lower(trim(regexp_replace(title, '\s+', ' ', 'g')))
    ) stored,
    type exercise_type not null,
    part exercise_part not null,
    level text,
    details text,
    -- Metrics: exactly one of reps or duration must be set (XOR constraint)
    reps integer check (reps is null or reps > 0),
    duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
    -- Series: always required
    series integer not null check (series > 0),
    -- Rest periods: at least one must be set
    rest_in_between_seconds integer check (rest_in_between_seconds is null or rest_in_between_seconds >= 0),
    rest_after_series_seconds integer check (rest_after_series_seconds is null or rest_after_series_seconds >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraint: exercise must have either reps OR duration, but not both
    -- This ensures metric type consistency
    constraint exercises_metric_check check (
        (reps is not null and duration_seconds is null) or
        (reps is null and duration_seconds is not null)
    ),
    -- Constraint: at least one rest period must be defined
    constraint exercises_rest_check check (
        rest_in_between_seconds is not null or rest_after_series_seconds is not null
    ),
    -- Constraint: unique title per user (case-insensitive)
    constraint exercises_unique_title unique (user_id, title_normalized)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------
-- Primary lookup: user's exercises
create index idx_exercises_user_id on exercises(user_id);
-- Title search within user's exercises
create index idx_exercises_user_id_title_normalized on exercises(user_id, title_normalized);
-- Filtering by muscle group
create index idx_exercises_user_id_part on exercises(user_id, part);
-- Filtering by exercise type
create index idx_exercises_user_id_type on exercises(user_id, type);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS
-- ----------------------------------------------------------------------------
-- Auto-update updated_at on row modification
create trigger exercises_updated_at
    before update on exercises
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table exercises enable row level security;

-- Policy: authenticated users can SELECT their own exercises
-- Rationale: Users should only see their own exercise library
create policy exercises_select_authenticated on exercises
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT exercises for themselves
-- Rationale: Users can only create exercises in their own library
create policy exercises_insert_authenticated on exercises
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Policy: authenticated users can UPDATE their own exercises
-- Rationale: Users can only modify their own exercises
create policy exercises_update_authenticated on exercises
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Policy: authenticated users can DELETE their own exercises
-- Rationale: Users can only delete their own exercises
-- Note: FK RESTRICT on workout_plan_exercises, workout_session_exercises,
--       and personal_records will prevent deletion if exercise has history
create policy exercises_delete_authenticated on exercises
    for delete
    to authenticated
    using (user_id = auth.uid());

-- Note: No policies for anon role - exercise data requires authentication

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
