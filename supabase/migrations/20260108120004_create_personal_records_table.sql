-- ============================================================================
-- Migration: Create Personal Records Table
-- ============================================================================
-- Purpose: Create the personal_records table for materialized PR tracking
--
-- Table created:
--   - personal_records: Stores pre-calculated personal records
--
-- Features:
--   - Materialized PR values (avoids expensive real-time calculations)
--   - Three metric types: total_reps, max_duration, max_weight
--   - One record per user per exercise per metric type
--   - Tracks when and where the PR was achieved
--   - Full RLS with user isolation
--
-- Dependencies:
--   - 20260108120000_create_enums_and_functions.sql (pr_metric_type,
--     update_updated_at_column)
--   - 20260108120001_create_exercises_table.sql (exercises table)
--   - 20260108120003_create_workout_sessions_tables.sql (workout_sessions table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: personal_records
-- ----------------------------------------------------------------------------
-- Stores pre-calculated personal records to avoid expensive queries
-- One record per user per exercise per metric type
-- Updated by recalculate_pr_for_exercise() function after each workout
create table personal_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    -- ON DELETE RESTRICT prevents deleting exercises with PR records
    -- This preserves achievement history integrity
    exercise_id uuid not null references exercises(id) on delete restrict,
    metric_type pr_metric_type not null,
    -- Record value (interpretation depends on metric_type):
    --   - total_reps: count of all reps
    --   - max_duration: seconds
    --   - max_weight: kilograms
    value numeric(10, 2) not null check (value >= 0),
    -- Metadata: when and where the PR was achieved
    achieved_at timestamptz not null,
    -- ON DELETE SET NULL preserves PR even if session is deleted
    achieved_in_session_id uuid references workout_sessions(id) on delete set null,
    achieved_in_set_number integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraint: one record per exercise per metric type per user
    -- This ensures we only store the current best, not history
    constraint personal_records_unique
        unique (user_id, exercise_id, metric_type)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------
-- Primary lookup: user's PRs (for achievements page)
create index idx_personal_records_user_id on personal_records(user_id);
-- PRs for a specific exercise (for exercise detail view)
create index idx_personal_records_exercise_id on personal_records(exercise_id);
-- Specific PR lookup (for PR calculation updates)
create index idx_personal_records_user_exercise_metric on personal_records(user_id, exercise_id, metric_type);
-- Recent PRs (for achievements display sorted by date)
create index idx_personal_records_user_id_achieved_at on personal_records(user_id, achieved_at desc);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS
-- ----------------------------------------------------------------------------
-- Auto-update updated_at on row modification
create trigger personal_records_updated_at
    before update on personal_records
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table personal_records enable row level security;

-- Policy: authenticated users can SELECT their own personal records
create policy personal_records_select_authenticated on personal_records
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT personal records for themselves
-- Note: Typically managed by recalculate_pr_for_exercise function,
--       but direct insert is allowed for edge cases
create policy personal_records_insert_authenticated on personal_records
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Policy: authenticated users can UPDATE their own personal records
-- Note: Typically managed by recalculate_pr_for_exercise function
create policy personal_records_update_authenticated on personal_records
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Policy: authenticated users can DELETE their own personal records
-- Rationale: Allow users to reset their PRs if needed
create policy personal_records_delete_authenticated on personal_records
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
