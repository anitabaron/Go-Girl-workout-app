-- ============================================================================
-- Migration: Create Workout Plans Tables
-- ============================================================================
-- Purpose: Create tables for workout plan templates and their exercises
--
-- Tables created:
--   - workout_plans: Workout plan templates
--   - workout_plan_exercises: Exercises within workout plans (junction table)
--
-- Features:
--   - Plans can be reused to start multiple sessions
--   - Exercises can have custom parameters per plan (overrides)
--   - Unique position within plan sections (Warm-up, Main, Cool-down)
--   - Full RLS with user isolation (via parent plan ownership)
--
-- Dependencies:
--   - 20260108120000_create_enums_and_functions.sql (exercise_type, exercise_part,
--     update_updated_at_column)
--   - 20260108120001_create_exercises_table.sql (exercises table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: workout_plans
-- ----------------------------------------------------------------------------
-- Stores reusable workout plan templates
-- Users can have multiple plans, each can be used to start sessions
create table workout_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    part exercise_part,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for workout_plans table
-- Primary lookup: user's plans
create index idx_workout_plans_user_id on workout_plans(user_id);
-- Recent plans first (for listing)
create index idx_workout_plans_user_id_created_at on workout_plans(user_id, created_at desc);

-- Trigger: auto-update updated_at on row modification
create trigger workout_plans_updated_at
    before update on workout_plans
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. TABLE: workout_plan_exercises
-- ----------------------------------------------------------------------------
-- Links exercises to workout plans with ordering and optional overrides
-- Position is unique per plan and section type
create table workout_plan_exercises (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references workout_plans(id) on delete cascade,
    -- ON DELETE RESTRICT prevents deleting exercises that are used in plans
    -- User must first remove exercise from all plans before deleting it
    exercise_id uuid not null references exercises(id) on delete restrict,
    section_type exercise_type not null,
    section_position integer not null check (section_position > 0),
    -- Planned parameters (optional overrides, NULL means use exercise defaults)
    planned_sets integer check (planned_sets is null or planned_sets > 0),
    planned_reps integer check (planned_reps is null or planned_reps > 0),
    planned_duration_seconds integer check (planned_duration_seconds is null or planned_duration_seconds > 0),
    planned_rest_seconds integer check (planned_rest_seconds is null or planned_rest_seconds >= 0),
    created_at timestamptz not null default now(),

    -- Constraint: unique position within a plan section
    constraint workout_plan_exercises_unique_position
        unique (plan_id, section_type, section_position)
);

-- Indexes for workout_plan_exercises table
-- Primary lookup: exercises in a plan
create index idx_workout_plan_exercises_plan_id on workout_plan_exercises(plan_id);
-- Lookup plans containing an exercise (for deletion check)
create index idx_workout_plan_exercises_exercise_id on workout_plan_exercises(exercise_id);
-- Ordered retrieval within plan sections
create index idx_workout_plan_exercises_plan_section on workout_plan_exercises(plan_id, section_type, section_position);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) - workout_plans
-- ----------------------------------------------------------------------------
alter table workout_plans enable row level security;

-- Policy: authenticated users can SELECT their own workout plans
create policy workout_plans_select_authenticated on workout_plans
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT workout plans for themselves
create policy workout_plans_insert_authenticated on workout_plans
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Policy: authenticated users can UPDATE their own workout plans
create policy workout_plans_update_authenticated on workout_plans
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Policy: authenticated users can DELETE their own workout plans
create policy workout_plans_delete_authenticated on workout_plans
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) - workout_plan_exercises
-- ----------------------------------------------------------------------------
alter table workout_plan_exercises enable row level security;

-- Policy: authenticated users can SELECT exercises in their own plans
-- Rationale: Access controlled through parent workout_plan ownership
create policy workout_plan_exercises_select_authenticated on workout_plan_exercises
    for select
    to authenticated
    using (
        exists (
            select 1 from workout_plans wp
            where wp.id = workout_plan_exercises.plan_id
            and wp.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can INSERT exercises into their own plans
create policy workout_plan_exercises_insert_authenticated on workout_plan_exercises
    for insert
    to authenticated
    with check (
        exists (
            select 1 from workout_plans wp
            where wp.id = workout_plan_exercises.plan_id
            and wp.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can UPDATE exercises in their own plans
create policy workout_plan_exercises_update_authenticated on workout_plan_exercises
    for update
    to authenticated
    using (
        exists (
            select 1 from workout_plans wp
            where wp.id = workout_plan_exercises.plan_id
            and wp.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from workout_plans wp
            where wp.id = workout_plan_exercises.plan_id
            and wp.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can DELETE exercises from their own plans
create policy workout_plan_exercises_delete_authenticated on workout_plan_exercises
    for delete
    to authenticated
    using (
        exists (
            select 1 from workout_plans wp
            where wp.id = workout_plan_exercises.plan_id
            and wp.user_id = auth.uid()
        )
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
