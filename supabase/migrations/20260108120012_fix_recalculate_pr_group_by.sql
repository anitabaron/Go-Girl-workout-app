-- ============================================================================
-- Migration: Fix GROUP BY clause in recalculate_pr_for_exercise
-- ============================================================================
-- Purpose: Fix SQL error "column wse.updated_at must appear in the GROUP BY
--          clause or be used in an aggregate function" in recalculate_pr_for_exercise
--
-- Problem: In the total_reps calculation, we use ORDER BY wse.updated_at but
--          wse.updated_at is not in GROUP BY clause
--
-- Solution: Use max(wse.updated_at) in ORDER BY instead of wse.updated_at
--
-- Dependencies:
--   - 20260108120006_create_advanced_functions.sql
-- ============================================================================

-- Fix the recalculate_pr_for_exercise function
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
        order by max(wse.updated_at) desc
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

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
