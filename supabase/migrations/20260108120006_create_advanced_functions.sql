-- ============================================================================
-- Migration: Create Advanced Functions
-- ============================================================================
-- Purpose: Create complex RPC functions for workout session management
--          and personal record calculations
--
-- Functions created:
--   - recalculate_pr_for_exercise(): Recalculate all PR types for an exercise
--   - save_workout_session_exercise(): Atomically save exercise data with sets
--
-- Features:
--   - SECURITY DEFINER for atomic operations with proper access control
--   - Automatic PR recalculation after saving workout data
--   - Session ownership validation
--   - Transaction-safe set replacement
--
-- Dependencies:
--   - All previous migrations (tables must exist)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FUNCTION: recalculate_pr_for_exercise
-- ----------------------------------------------------------------------------
-- Purpose: Recalculates personal records for a specific exercise
-- Called after: saving or updating workout session sets
-- Metrics calculated:
--   - total_reps: Sum of all reps across all sessions for the exercise
--   - max_duration: Maximum single-set duration
--   - max_weight: Maximum single-set weight
--
-- Parameters:
--   - p_user_id: The user's UUID
--   - p_exercise_id: The exercise to recalculate PRs for
--
-- Returns: void
--
-- Security: SECURITY DEFINER to bypass RLS for cross-table aggregation
create or replace function recalculate_pr_for_exercise(
    p_user_id uuid,
    p_exercise_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_total_reps integer;
    v_max_duration integer;
    v_max_weight numeric(6, 2);
    v_achieved_at timestamptz;
    v_session_id uuid;
    v_set_number integer;
begin
    -- ========================================================================
    -- TOTAL REPS PR
    -- ========================================================================
    -- Calculate total_reps (sum of all reps across all sessions for this exercise)
    select
        coalesce(sum(wss.reps), 0),
        max(wse.updated_at)
    into v_total_reps, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (
            select id from workout_sessions where user_id = p_user_id
        )
        and wss.reps is not null
        and wss.reps > 0;

    -- Insert or update total_reps PR
    if v_total_reps > 0 then
        insert into personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'total_reps'::pr_metric_type, v_total_reps,
            v_achieved_at, wse.session_id, max(wss.set_number)
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.reps is not null
            and wss.reps > 0
        group by wse.session_id
        having sum(wss.reps) = v_total_reps
        order by wse.updated_at desc
        limit 1
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            achieved_at = excluded.achieved_at,
            achieved_in_session_id = excluded.achieved_in_session_id,
            achieved_in_set_number = excluded.achieved_in_set_number,
            updated_at = now();
    end if;

    -- ========================================================================
    -- MAX DURATION PR
    -- ========================================================================
    -- Calculate max_duration (maximum from a single set)
    select
        max(wss.duration_seconds),
        max(wse.updated_at)
    into v_max_duration, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (
            select id from workout_sessions where user_id = p_user_id
        )
        and wss.duration_seconds is not null
        and wss.duration_seconds > 0;

    -- Insert or update max_duration PR
    if v_max_duration > 0 then
        insert into personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'max_duration'::pr_metric_type, v_max_duration,
            wse.updated_at, wse.session_id, wss.set_number
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.duration_seconds = v_max_duration
            and wss.duration_seconds > 0
        order by wse.updated_at desc
        limit 1
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            achieved_at = excluded.achieved_at,
            achieved_in_session_id = excluded.achieved_in_session_id,
            achieved_in_set_number = excluded.achieved_in_set_number,
            updated_at = now();
    end if;

    -- ========================================================================
    -- MAX WEIGHT PR
    -- ========================================================================
    -- Calculate max_weight (maximum from a single set)
    select
        max(wss.weight_kg),
        max(wse.updated_at)
    into v_max_weight, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (
            select id from workout_sessions where user_id = p_user_id
        )
        and wss.weight_kg is not null
        and wss.weight_kg > 0;

    -- Insert or update max_weight PR
    if v_max_weight > 0 then
        insert into personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'max_weight'::pr_metric_type, v_max_weight,
            wse.updated_at, wse.session_id, wss.set_number
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.weight_kg = v_max_weight
            and wss.weight_kg > 0
        order by wse.updated_at desc
        limit 1
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            achieved_at = excluded.achieved_at,
            achieved_in_session_id = excluded.achieved_in_session_id,
            achieved_in_set_number = excluded.achieved_in_set_number,
            updated_at = now();
    end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. FUNCTION: save_workout_session_exercise
-- ----------------------------------------------------------------------------
-- Purpose: Atomically saves exercise data and sets, then recalculates PRs
-- Security: Validates session ownership before making changes
--
-- Parameters:
--   - p_session_id: The workout session UUID
--   - p_exercise_id: The exercise being performed
--   - p_position: Position in the session order
--   - p_actual_sets: Number of sets completed
--   - p_actual_reps: Total reps completed
--   - p_actual_duration_seconds: Total duration in seconds
--   - p_actual_rest_seconds: Rest time taken
--   - p_is_skipped: Whether the exercise was skipped
--   - p_sets_data: JSON array of set data [{reps, duration_seconds, weight_kg}, ...]
--
-- Returns: UUID of the session exercise record
--
-- Security: SECURITY DEFINER with explicit auth.uid() validation
create or replace function save_workout_session_exercise(
    p_session_id uuid,
    p_exercise_id uuid,
    p_position integer,
    p_actual_sets integer default null,
    p_actual_reps integer default null,
    p_actual_duration_seconds integer default null,
    p_actual_rest_seconds integer default null,
    p_is_skipped boolean default false,
    p_sets_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_session_exercise_id uuid;
    v_set_item jsonb;
    v_set_number integer := 1;
begin
    -- ========================================================================
    -- SECURITY CHECK: Verify session ownership
    -- ========================================================================
    select user_id into v_user_id
    from workout_sessions
    where id = p_session_id;

    if v_user_id is null then
        raise exception 'Session not found';
    end if;

    -- Ensure the calling user owns this session
    if v_user_id != auth.uid() then
        raise exception 'Access denied';
    end if;

    -- ========================================================================
    -- GET OR CREATE SESSION EXERCISE
    -- ========================================================================
    select id into v_session_exercise_id
    from workout_session_exercises
    where session_id = p_session_id and position = p_position;

    if v_session_exercise_id is null then
        -- Create new entry (should already exist from snapshot, but handle edge case)
        insert into workout_session_exercises (
            session_id, exercise_id, position,
            exercise_title_at_time, exercise_type_at_time, exercise_part_at_time,
            actual_sets, actual_reps, actual_duration_seconds, actual_rest_seconds,
            is_skipped
        )
        select
            p_session_id, p_exercise_id, p_position,
            e.title, e.type, e.part,
            p_actual_sets, p_actual_reps, p_actual_duration_seconds, p_actual_rest_seconds,
            p_is_skipped
        from exercises e
        where e.id = p_exercise_id and e.user_id = v_user_id
        returning id into v_session_exercise_id;
    else
        -- Update existing entry with new actual values
        update workout_session_exercises
        set
            actual_sets = coalesce(p_actual_sets, actual_sets),
            actual_reps = coalesce(p_actual_reps, actual_reps),
            actual_duration_seconds = coalesce(p_actual_duration_seconds, actual_duration_seconds),
            actual_rest_seconds = coalesce(p_actual_rest_seconds, actual_rest_seconds),
            is_skipped = p_is_skipped,
            updated_at = now()
        where id = v_session_exercise_id;
    end if;

    -- ========================================================================
    -- HANDLE SETS DATA
    -- ========================================================================
    if p_sets_data is not null and jsonb_array_length(p_sets_data) > 0 then
        -- DESTRUCTIVE: Remove existing sets to replace with new data
        -- This is intentional - we're replacing the entire set list
        delete from workout_session_sets
        where session_exercise_id = v_session_exercise_id;

        -- Insert new sets from JSON array
        for v_set_item in select * from jsonb_array_elements(p_sets_data)
        loop
            insert into workout_session_sets (
                session_exercise_id, set_number,
                reps, duration_seconds, weight_kg
            )
            values (
                v_session_exercise_id, v_set_number,
                (v_set_item->>'reps')::integer,
                (v_set_item->>'duration_seconds')::integer,
                (v_set_item->>'weight_kg')::numeric
            );
            v_set_number := v_set_number + 1;
        end loop;
    end if;

    -- ========================================================================
    -- RECALCULATE PERSONAL RECORDS
    -- ========================================================================
    perform recalculate_pr_for_exercise(v_user_id, p_exercise_id);

    -- ========================================================================
    -- UPDATE SESSION PROGRESS
    -- ========================================================================
    update workout_sessions
    set last_action_at = now(), current_position = p_position
    where id = p_session_id;

    return v_session_exercise_id;
end;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
