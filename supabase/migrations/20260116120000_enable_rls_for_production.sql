-- ============================================================================
-- Migration: Re-enable RLS for Production
-- ============================================================================
-- Purpose: Re-enable Row Level Security policies after implementing
--          proper authentication in the application layer
--
-- Actions:
--   1. Enable RLS on all tables
--   2. Re-create all RLS policies
--
-- Dependencies: All previous migrations (tables must exist)
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

alter table exercises enable row level security;
alter table workout_plans enable row level security;
alter table workout_plan_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_session_exercises enable row level security;
alter table workout_session_sets enable row level security;
alter table personal_records enable row level security;
alter table ai_usage enable row level security;
alter table ai_requests enable row level security;

-- Only enable RLS on test-num if table exists
do $$
begin
    if exists (select 1 from information_schema.tables where table_name = 'test-num') then
        alter table "test-num" enable row level security;
    end if;
end $$;

-- ============================================================================
-- 2. CREATE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- exercises table policies
-- ----------------------------------------------------------------------------
create policy exercises_select_authenticated on exercises
    for select
    to authenticated
    using (user_id = auth.uid());

create policy exercises_insert_authenticated on exercises
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy exercises_update_authenticated on exercises
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy exercises_delete_authenticated on exercises
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_plans table policies
-- ----------------------------------------------------------------------------
create policy workout_plans_select_authenticated on workout_plans
    for select
    to authenticated
    using (user_id = auth.uid());

create policy workout_plans_insert_authenticated on workout_plans
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy workout_plans_update_authenticated on workout_plans
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy workout_plans_delete_authenticated on workout_plans
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_plan_exercises table policies
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- workout_sessions table policies
-- ----------------------------------------------------------------------------
create policy workout_sessions_select_authenticated on workout_sessions
    for select
    to authenticated
    using (user_id = auth.uid());

create policy workout_sessions_insert_authenticated on workout_sessions
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy workout_sessions_update_authenticated on workout_sessions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy workout_sessions_delete_authenticated on workout_sessions
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_session_exercises table policies
-- ----------------------------------------------------------------------------
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
-- workout_session_sets table policies
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- personal_records table policies
-- ----------------------------------------------------------------------------
create policy personal_records_select_authenticated on personal_records
    for select
    to authenticated
    using (user_id = auth.uid());

create policy personal_records_insert_authenticated on personal_records
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy personal_records_update_authenticated on personal_records
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy personal_records_delete_authenticated on personal_records
    for delete
    to authenticated
    using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ai_usage table policies
-- ----------------------------------------------------------------------------
create policy ai_usage_select_authenticated on ai_usage
    for select
    to authenticated
    using (user_id = auth.uid());

create policy ai_usage_insert_authenticated on ai_usage
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy ai_usage_update_authenticated on ai_usage
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ai_requests table policies
-- ----------------------------------------------------------------------------
create policy ai_requests_select_authenticated on ai_requests
    for select
    to authenticated
    using (user_id = auth.uid());

create policy ai_requests_insert_authenticated on ai_requests
    for insert
    to authenticated
    with check (user_id = auth.uid());

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
