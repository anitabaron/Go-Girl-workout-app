-- ============================================================================
-- Migration: Create Workout Sessions Tables
-- ============================================================================
-- Purpose: Create tables for tracking workout sessions and their data
--
-- Tables created:
--   - workout_sessions: Active and completed workout sessions
--   - workout_session_exercises: Exercises within a session (with snapshots)
--   - workout_session_sets: Individual sets within session exercises
--
-- Features:
--   - Only ONE in_progress session per user (partial unique index)
--   - Snapshots of exercise data at session start (immutable history)
--   - Planned vs actual metrics tracking
--   - Resume tracking via current_position
--   - Full RLS with user isolation
--
-- Dependencies:
--   - 20260108120000_create_enums_and_functions.sql (enums, update_updated_at_column)
--   - 20260108120001_create_exercises_table.sql (exercises table)
--   - 20260108120002_create_workout_plans_tables.sql (workout_plans table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: workout_sessions
-- ----------------------------------------------------------------------------
-- Tracks individual workout sessions with status and progress
-- Only one in_progress session per user is allowed (partial unique index)
create table workout_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    -- ON DELETE SET NULL preserves session history if plan is deleted
    workout_plan_id uuid references workout_plans(id) on delete set null,
    status workout_session_status not null default 'in_progress',
    -- Snapshot: plan name at session start (preserved even if plan deleted/renamed)
    plan_name_at_time text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    -- Resume tracking: which exercise the user was on
    current_position integer default 0 check (current_position >= 0),
    last_action_at timestamptz not null default now()
);

-- Indexes for workout_sessions table
-- Primary lookup: user's sessions
create index idx_workout_sessions_user_id on workout_sessions(user_id);
-- Recent sessions first (for history)
create index idx_workout_sessions_user_id_started_at on workout_sessions(user_id, started_at desc);
-- Filter by status
create index idx_workout_sessions_user_id_status on workout_sessions(user_id, status);
-- Sessions from a specific plan
create index idx_workout_sessions_workout_plan_id on workout_sessions(workout_plan_id);

-- Partial unique index: enforces only ONE in_progress session per user
-- This is a critical business rule that must be enforced at the database level
-- Attempting to insert a second in_progress session will fail with unique violation
create unique index idx_workout_sessions_user_in_progress
    on workout_sessions(user_id)
    where status = 'in_progress';

-- ----------------------------------------------------------------------------
-- 2. TABLE: workout_session_exercises
-- ----------------------------------------------------------------------------
-- Stores exercises in a session with snapshots of exercise data at session start
-- Includes both planned and actual metrics for tracking performance
create table workout_session_exercises (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references workout_sessions(id) on delete cascade,
    -- ON DELETE RESTRICT prevents deleting exercises with session history
    -- This preserves workout history integrity
    exercise_id uuid not null references exercises(id) on delete restrict,
    -- Snapshot: exercise data at session start (immutable history)
    -- These values are copied when session starts and never change
    exercise_title_at_time text not null,
    exercise_type_at_time exercise_type not null,
    exercise_part_at_time exercise_part not null,
    -- Planned parameters (copied from plan or exercise at session start)
    planned_sets integer check (planned_sets is null or planned_sets > 0),
    planned_reps integer check (planned_reps is null or planned_reps > 0),
    planned_duration_seconds integer check (planned_duration_seconds is null or planned_duration_seconds > 0),
    planned_rest_seconds integer check (planned_rest_seconds is null or planned_rest_seconds >= 0),
    -- Actual parameters (what the user actually did, editable during session)
    actual_sets integer check (actual_sets is null or actual_sets >= 0),
    actual_reps integer check (actual_reps is null or actual_reps >= 0),
    actual_duration_seconds integer check (actual_duration_seconds is null or actual_duration_seconds >= 0),
    actual_rest_seconds integer check (actual_rest_seconds is null or actual_rest_seconds >= 0),
    -- Ordering within session
    position integer not null check (position > 0),
    -- Skip flag: user can skip exercises without recording data
    is_skipped boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraint: unique position within a session
    constraint workout_session_exercises_unique_position
        unique (session_id, position)
);

-- Indexes for workout_session_exercises table
-- Primary lookup: exercises in a session
create index idx_workout_session_exercises_session_id on workout_session_exercises(session_id);
-- Lookup sessions containing an exercise (for PR calculation)
create index idx_workout_session_exercises_exercise_id on workout_session_exercises(exercise_id);
-- Ordered retrieval within session
create index idx_workout_session_exercises_session_position on workout_session_exercises(session_id, position);

-- Trigger: auto-update updated_at on row modification
create trigger workout_session_exercises_updated_at
    before update on workout_session_exercises
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. TABLE: workout_session_sets
-- ----------------------------------------------------------------------------
-- Stores detailed metrics for each set performed in an exercise
-- At least one metric must be recorded per set
create table workout_session_sets (
    id uuid primary key default gen_random_uuid(),
    session_exercise_id uuid not null references workout_session_exercises(id) on delete cascade,
    set_number integer not null check (set_number > 0),
    -- Metrics: at least one must be non-null (enforced by constraint)
    reps integer check (reps is null or reps >= 0),
    duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
    weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraint: at least one metric must be recorded
    -- This ensures sets have meaningful data
    constraint workout_session_sets_metric_check check (
        reps is not null or duration_seconds is not null or weight_kg is not null
    ),
    -- Constraint: unique set number within an exercise
    constraint workout_session_sets_unique_number
        unique (session_exercise_id, set_number)
);

-- Indexes for workout_session_sets table
-- Primary lookup: sets in an exercise
create index idx_workout_session_sets_session_exercise_id on workout_session_sets(session_exercise_id);
-- PR calculation index: includes all metrics for efficient aggregation
create index idx_workout_session_sets_for_pr_calculation on workout_session_sets(session_exercise_id, reps, duration_seconds, weight_kg);

-- Trigger: auto-update updated_at on row modification
create trigger workout_session_sets_updated_at
    before update on workout_session_sets
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) - workout_sessions
-- ----------------------------------------------------------------------------
alter table workout_sessions enable row level security;

-- Policy: authenticated users can SELECT their own workout sessions
create policy workout_sessions_select_authenticated on workout_sessions
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT workout sessions for themselves
create policy workout_sessions_insert_authenticated on workout_sessions
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Policy: authenticated users can UPDATE their own workout sessions
create policy workout_sessions_update_authenticated on workout_sessions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Policy: authenticated users can DELETE their own workout sessions
create policy workout_sessions_delete_authenticated on workout_sessions
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) - workout_session_exercises
-- ----------------------------------------------------------------------------
alter table workout_session_exercises enable row level security;

-- Policy: authenticated users can SELECT exercises in their own sessions
-- Rationale: Access controlled through parent workout_session ownership
create policy workout_session_exercises_select_authenticated on workout_session_exercises
    for select
    to authenticated
    using (
        exists (
            select 1 from workout_sessions ws
            where ws.id = workout_session_exercises.session_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can INSERT exercises into their own sessions
create policy workout_session_exercises_insert_authenticated on workout_session_exercises
    for insert
    to authenticated
    with check (
        exists (
            select 1 from workout_sessions ws
            where ws.id = workout_session_exercises.session_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can UPDATE exercises in their own sessions
create policy workout_session_exercises_update_authenticated on workout_session_exercises
    for update
    to authenticated
    using (
        exists (
            select 1 from workout_sessions ws
            where ws.id = workout_session_exercises.session_id
            and ws.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from workout_sessions ws
            where ws.id = workout_session_exercises.session_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can DELETE exercises from their own sessions
create policy workout_session_exercises_delete_authenticated on workout_session_exercises
    for delete
    to authenticated
    using (
        exists (
            select 1 from workout_sessions ws
            where ws.id = workout_session_exercises.session_id
            and ws.user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - workout_session_sets
-- ----------------------------------------------------------------------------
alter table workout_session_sets enable row level security;

-- Policy: authenticated users can SELECT sets in their own session exercises
-- Rationale: Access controlled through grandparent workout_session ownership
create policy workout_session_sets_select_authenticated on workout_session_sets
    for select
    to authenticated
    using (
        exists (
            select 1 from workout_session_exercises wse
            join workout_sessions ws on ws.id = wse.session_id
            where wse.id = workout_session_sets.session_exercise_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can INSERT sets into their own session exercises
create policy workout_session_sets_insert_authenticated on workout_session_sets
    for insert
    to authenticated
    with check (
        exists (
            select 1 from workout_session_exercises wse
            join workout_sessions ws on ws.id = wse.session_id
            where wse.id = workout_session_sets.session_exercise_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can UPDATE sets in their own session exercises
create policy workout_session_sets_update_authenticated on workout_session_sets
    for update
    to authenticated
    using (
        exists (
            select 1 from workout_session_exercises wse
            join workout_sessions ws on ws.id = wse.session_id
            where wse.id = workout_session_sets.session_exercise_id
            and ws.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from workout_session_exercises wse
            join workout_sessions ws on ws.id = wse.session_id
            where wse.id = workout_session_sets.session_exercise_id
            and ws.user_id = auth.uid()
        )
    );

-- Policy: authenticated users can DELETE sets from their own session exercises
create policy workout_session_sets_delete_authenticated on workout_session_sets
    for delete
    to authenticated
    using (
        exists (
            select 1 from workout_session_exercises wse
            join workout_sessions ws on ws.id = wse.session_id
            where wse.id = workout_session_sets.session_exercise_id
            and ws.user_id = auth.uid()
        )
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
