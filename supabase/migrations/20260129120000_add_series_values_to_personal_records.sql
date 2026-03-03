-- ============================================================================
-- Migration: Add series_values to personal_records
-- ============================================================================
-- Purpose: Store per-set values for PR metrics (e.g. S1:10, S2:10, S3:10)
--          Enables displaying sum + series breakdown and highlighting exceptional sets
--
-- Changes:
--   - Add series_values jsonb column to personal_records
--   - Update recalculate_pr_for_exercise to populate series_values
--
-- Format: { "S1": 10, "S2": 10, "S3": 10 } for total_reps
--         { "S1": 45, "S2": 30, "S3": 60 } for max_duration (seconds per set)
--         { "S1": 20, "S2": 25, "S3": 22 } for max_weight (kg per set)
--
-- Dependencies:
--   - 20260108120004_create_personal_records_table.sql
--   - 20260108120012_fix_recalculate_pr_group_by.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMN: series_values
-- ----------------------------------------------------------------------------
alter table personal_records
add column series_values jsonb default null;

comment on column personal_records.series_values is
  'Per-set values for the PR session. Format: {"S1": value, "S2": value, ...}. Used for total_reps, max_duration, max_weight.';

-- ----------------------------------------------------------------------------
-- 2. UPDATE FUNCTION: recalculate_pr_for_exercise
-- ----------------------------------------------------------------------------
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
    v_session_exercise_id uuid;
    v_series_values jsonb;
begin
    -- ========================================================================
    -- TOTAL REPS PR
    -- ========================================================================
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

    if v_total_reps > 0 then
        -- Get session_exercise_id for the session that achieved max total reps
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.reps is not null
            and wss.reps > 0
        group by wse.id, wse.session_id
        having sum(wss.reps) = v_total_reps
        order by max(wse.updated_at) desc
        limit 1;

        -- Build series_values JSON: {"S1": reps1, "S2": reps2, ...}
        -- ORDER BY inside aggregate to avoid "must appear in GROUP BY" error
        select coalesce(
            jsonb_object_agg('S' || wss.set_number, wss.reps ORDER BY wss.set_number),
            '{}'::jsonb
        ) into v_series_values
        from workout_session_sets wss
        where wss.session_exercise_id = v_session_exercise_id
            and wss.reps is not null
            and wss.reps > 0;

        insert into personal_records (
            user_id, exercise_id, metric_type, value, series_values,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'total_reps'::pr_metric_type, v_total_reps, v_series_values,
            v_achieved_at, wse.session_id, max(wss.set_number)
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.id = v_session_exercise_id
            and wss.reps is not null
            and wss.reps > 0
        group by wse.session_id
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            series_values = excluded.series_values,
            achieved_at = excluded.achieved_at,
            achieved_in_session_id = excluded.achieved_in_session_id,
            achieved_in_set_number = excluded.achieved_in_set_number,
            updated_at = now();
    end if;

    -- ========================================================================
    -- MAX DURATION PR
    -- ========================================================================
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

    if v_max_duration > 0 then
        -- Get session_exercise_id for the session that has the max duration set
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.duration_seconds = v_max_duration
            and wss.duration_seconds > 0
        order by wse.updated_at desc
        limit 1;

        -- Build series_values JSON: {"S1": sec1, "S2": sec2, ...}
        select coalesce(
            jsonb_object_agg('S' || wss.set_number, wss.duration_seconds ORDER BY wss.set_number),
            '{}'::jsonb
        ) into v_series_values
        from workout_session_sets wss
        where wss.session_exercise_id = v_session_exercise_id
            and wss.duration_seconds is not null;

        insert into personal_records (
            user_id, exercise_id, metric_type, value, series_values,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'max_duration'::pr_metric_type, v_max_duration, v_series_values,
            wse.updated_at, wse.session_id, wss.set_number
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.id = v_session_exercise_id
            and wss.duration_seconds = v_max_duration
        order by wse.updated_at desc
        limit 1
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            series_values = excluded.series_values,
            achieved_at = excluded.achieved_at,
            achieved_in_session_id = excluded.achieved_in_session_id,
            achieved_in_set_number = excluded.achieved_in_set_number,
            updated_at = now();
    end if;

    -- ========================================================================
    -- MAX WEIGHT PR
    -- ========================================================================
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

    if v_max_weight > 0 then
        -- Get session_exercise_id for the session that has the max weight set
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (
                select id from workout_sessions where user_id = p_user_id
            )
            and wss.weight_kg = v_max_weight
            and wss.weight_kg > 0
        order by wse.updated_at desc
        limit 1;

        -- Build series_values JSON: {"S1": kg1, "S2": kg2, ...}
        select coalesce(
            jsonb_object_agg('S' || wss.set_number, wss.weight_kg ORDER BY wss.set_number),
            '{}'::jsonb
        ) into v_series_values
        from workout_session_sets wss
        where wss.session_exercise_id = v_session_exercise_id
            and wss.weight_kg is not null;

        insert into personal_records (
            user_id, exercise_id, metric_type, value, series_values,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        select
            p_user_id, p_exercise_id, 'max_weight'::pr_metric_type, v_max_weight, v_series_values,
            wse.updated_at, wse.session_id, wss.set_number
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.id = v_session_exercise_id
            and wss.weight_kg = v_max_weight
        order by wse.updated_at desc
        limit 1
        on conflict (user_id, exercise_id, metric_type)
        do update set
            value = excluded.value,
            series_values = excluded.series_values,
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
