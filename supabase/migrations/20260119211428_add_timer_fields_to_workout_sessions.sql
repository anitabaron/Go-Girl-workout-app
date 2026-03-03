-- ============================================================================
-- Migration: Add Timer Fields to Workout Sessions
-- ============================================================================
-- Purpose: Add timer tracking fields to workout_sessions table
--
-- Fields added:
--   - active_duration_seconds: Cumulative active timer duration (seconds)
--   - last_timer_started_at: Timestamp of last timer start/resume
--   - last_timer_stopped_at: Timestamp of last timer pause/exit
--
-- Features:
--   - active_duration_seconds is cumulative (adds to existing value)
--   - Timer tracks only when workout assistant is open and active
--   - Supports start/resume and pause/exit operations
--
-- Dependencies:
--   - 20260108120003_create_workout_sessions_tables.sql (workout_sessions table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD TIMER FIELDS TO workout_sessions
-- ----------------------------------------------------------------------------

-- Add active_duration_seconds: cumulative timer duration in seconds
-- Default: 0, must be >= 0
alter table workout_sessions
    add column if not exists active_duration_seconds integer default 0 check (active_duration_seconds >= 0);

-- Add last_timer_started_at: timestamp of last timer start/resume
-- Nullable: null when timer has never been started
alter table workout_sessions
    add column if not exists last_timer_started_at timestamptz;

-- Add last_timer_stopped_at: timestamp of last timer pause/exit
-- Nullable: null when timer has never been stopped
alter table workout_sessions
    add column if not exists last_timer_stopped_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. UPDATE EXISTING ROWS (if any)
-- ----------------------------------------------------------------------------
-- Set default value for existing rows that might have null
update workout_sessions
set active_duration_seconds = 0
where active_duration_seconds is null;

-- ----------------------------------------------------------------------------
-- 3. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------
comment on column workout_sessions.active_duration_seconds is 
    'Cumulative active timer duration in seconds. Timer runs only when workout assistant is open and active. Value is cumulative (adds to existing value on each update).';

comment on column workout_sessions.last_timer_started_at is 
    'Timestamp of last timer start/resume. Set when timer starts or resumes after pause. Null if timer has never been started.';

comment on column workout_sessions.last_timer_stopped_at is 
    'Timestamp of last timer pause/exit. Set when timer is paused or when user exits workout assistant. Null if timer has never been stopped.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
