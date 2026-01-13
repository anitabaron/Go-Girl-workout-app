-- ============================================================================
-- Migration: Disable RLS for Development
-- ============================================================================
-- Purpose: Temporarily disable all Row Level Security policies for REST API
--          development without authentication
--
-- WARNING: This migration removes all security policies. Use only in development!
--          DO NOT apply this migration in production environments.
--
-- Actions:
--   1. Drop all existing RLS policies
--   2. Disable RLS on all tables
--
-- Dependencies: All previous migrations (tables must exist)
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL POLICIES
-- ============================================================================

-- Drop policies from exercises table
drop policy if exists exercises_select_authenticated on exercises;
drop policy if exists exercises_insert_authenticated on exercises;
drop policy if exists exercises_update_authenticated on exercises;
drop policy if exists exercises_delete_authenticated on exercises;

-- Drop policies from workout_plans table
drop policy if exists workout_plans_select_authenticated on workout_plans;
drop policy if exists workout_plans_insert_authenticated on workout_plans;
drop policy if exists workout_plans_update_authenticated on workout_plans;
drop policy if exists workout_plans_delete_authenticated on workout_plans;

-- Drop policies from workout_plan_exercises table
drop policy if exists workout_plan_exercises_select_authenticated on workout_plan_exercises;
drop policy if exists workout_plan_exercises_insert_authenticated on workout_plan_exercises;
drop policy if exists workout_plan_exercises_update_authenticated on workout_plan_exercises;
drop policy if exists workout_plan_exercises_delete_authenticated on workout_plan_exercises;

-- Drop policies from workout_sessions table
drop policy if exists workout_sessions_select_authenticated on workout_sessions;
drop policy if exists workout_sessions_insert_authenticated on workout_sessions;
drop policy if exists workout_sessions_update_authenticated on workout_sessions;
drop policy if exists workout_sessions_delete_authenticated on workout_sessions;

-- Drop policies from workout_session_exercises table
drop policy if exists workout_session_exercises_select_authenticated on workout_session_exercises;
drop policy if exists workout_session_exercises_insert_authenticated on workout_session_exercises;
drop policy if exists workout_session_exercises_update_authenticated on workout_session_exercises;
drop policy if exists workout_session_exercises_delete_authenticated on workout_session_exercises;

-- Drop policies from workout_session_sets table
drop policy if exists workout_session_sets_select_authenticated on workout_session_sets;
drop policy if exists workout_session_sets_insert_authenticated on workout_session_sets;
drop policy if exists workout_session_sets_update_authenticated on workout_session_sets;
drop policy if exists workout_session_sets_delete_authenticated on workout_session_sets;

-- Drop policies from personal_records table
drop policy if exists personal_records_select_authenticated on personal_records;
drop policy if exists personal_records_insert_authenticated on personal_records;
drop policy if exists personal_records_update_authenticated on personal_records;
drop policy if exists personal_records_delete_authenticated on personal_records;

-- Drop policies from ai_usage table
drop policy if exists ai_usage_select_authenticated on ai_usage;
drop policy if exists ai_usage_insert_authenticated on ai_usage;
drop policy if exists ai_usage_update_authenticated on ai_usage;

-- Drop policies from ai_requests table
drop policy if exists ai_requests_select_authenticated on ai_requests;
drop policy if exists ai_requests_insert_authenticated on ai_requests;

-- ============================================================================
-- 2. DISABLE RLS ON ALL TABLES
-- ============================================================================

alter table exercises disable row level security;
alter table workout_plans disable row level security;
alter table workout_plan_exercises disable row level security;
alter table workout_sessions disable row level security;
alter table workout_session_exercises disable row level security;
alter table workout_session_sets disable row level security;
alter table personal_records disable row level security;
alter table ai_usage disable row level security;
alter table ai_requests disable row level security;

-- Only disable RLS on test-num if table exists
do $$
begin
    if exists (select 1 from information_schema.tables where table_name = 'test-num') then
        alter table "test-num" disable row level security;
    end if;
end $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- NOTE: To re-enable RLS in the future, you would need to:
-- 1. Re-enable RLS: alter table <table_name> enable row level security;
-- 2. Re-create all policies from the original migration files
-- ============================================================================
