-- ============================================================================
-- Migration: Create AI Tables
-- ============================================================================
-- Purpose: Create tables for AI usage tracking and request logging
--
-- Tables created:
--   - ai_usage: Monthly AI usage tracking (5/month limit)
--   - ai_requests: AI request logs for debugging and analytics
--
-- Features:
--   - Monthly usage counter with hard limit of 5
--   - Request logging without PII
--   - System error tracking (don't count against limit)
--   - Full RLS with user isolation
--
-- Dependencies:
--   - 20260108120000_create_enums_and_functions.sql (ai_request_type,
--     update_updated_at_column)
--   - 20260108120002_create_workout_plans_tables.sql (workout_plans table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: ai_usage
-- ----------------------------------------------------------------------------
-- Tracks AI usage per user per month with a 5/month limit
-- Each row represents one month for one user
-- New month = new row with usage_count = 0
create table ai_usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    -- Month represented as first day of month (YYYY-MM-01)
    -- Example: 2026-01-01 for January 2026
    month_year date not null,
    -- Usage counter with hard limit of 5
    -- CHECK constraint prevents exceeding limit at database level
    usage_count integer not null default 0 check (usage_count >= 0 and usage_count <= 5),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Constraint: one row per user per month
    -- New month automatically creates new row when first AI request is made
    constraint ai_usage_unique unique (user_id, month_year)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES - ai_usage
-- ----------------------------------------------------------------------------
-- Primary lookup: user's usage history
create index idx_ai_usage_user_id on ai_usage(user_id);
-- Current month lookup (most common query)
create index idx_ai_usage_user_month on ai_usage(user_id, month_year);

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS - ai_usage
-- ----------------------------------------------------------------------------
-- Auto-update updated_at on row modification
create trigger ai_usage_updated_at
    before update on ai_usage
    for each row
    execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. TABLE: ai_requests
-- ----------------------------------------------------------------------------
-- Logs all AI interactions for debugging and analytics
-- Does not store PII in input_params (user preferences only)
create table ai_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    request_type ai_request_type not null,
    -- Input parameters (no PII, JSON for flexibility)
    -- Example: {"part": "Legs", "duration_minutes": 30}
    input_params jsonb,
    -- AI response (JSON) - the generated/optimized workout plan
    response_json jsonb,
    -- Error information (if request failed)
    error_code text,
    error_message text,
    -- System errors don't count against usage limit
    -- Examples: API timeout, model unavailable, rate limit
    is_system_error boolean not null default false,
    -- Link to workout plan if applicable (for optimize requests)
    -- ON DELETE SET NULL preserves request log if plan is deleted
    workout_plan_id uuid references workout_plans(id) on delete set null,
    created_at timestamptz not null default now()
    -- Note: No updated_at - logs are immutable
);

-- ----------------------------------------------------------------------------
-- 5. INDEXES - ai_requests
-- ----------------------------------------------------------------------------
-- Primary lookup: user's request history
create index idx_ai_requests_user_id on ai_requests(user_id);
-- Recent requests (for debugging/history display)
create index idx_ai_requests_user_id_created_at on ai_requests(user_id, created_at desc);
-- System error monitoring (for ops dashboard)
create index idx_ai_requests_is_system_error on ai_requests(is_system_error);
-- Requests for a specific plan
create index idx_ai_requests_workout_plan_id on ai_requests(workout_plan_id);

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) - ai_usage
-- ----------------------------------------------------------------------------
alter table ai_usage enable row level security;

-- Policy: authenticated users can SELECT their own AI usage
-- Rationale: Users need to see their remaining quota
create policy ai_usage_select_authenticated on ai_usage
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT AI usage records for themselves
-- Note: First AI request of the month creates the row
create policy ai_usage_insert_authenticated on ai_usage
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Policy: authenticated users can UPDATE their own AI usage
-- Note: Usage count incremented atomically by application
create policy ai_usage_update_authenticated on ai_usage
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Note: No DELETE policy for ai_usage
-- Rationale: Records should be retained for auditing and quota enforcement
-- Admin can delete via service role if needed

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) - ai_requests
-- ----------------------------------------------------------------------------
alter table ai_requests enable row level security;

-- Policy: authenticated users can SELECT their own AI requests
-- Rationale: Users can view their AI generation history
create policy ai_requests_select_authenticated on ai_requests
    for select
    to authenticated
    using (user_id = auth.uid());

-- Policy: authenticated users can INSERT AI requests for themselves
-- Rationale: Application logs requests after AI calls
create policy ai_requests_insert_authenticated on ai_requests
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- Note: No UPDATE or DELETE policies for ai_requests
-- Rationale: Logs should be immutable for audit trail
-- Admin can modify via service role if needed

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
