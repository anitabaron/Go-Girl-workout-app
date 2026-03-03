-- ============================================================================
-- Migration: PR update only when new value is better
-- ============================================================================
-- Purpose: Fix bug where editing an old session (e.g. reducing 3 sets to 1 set)
--          overwrote the personal record with a lower value.
--
-- Expected: Rekord (total_reps, max_duration, max_weight) powinien się
--           aktualizować tylko gdy nowa wartość jest większa od obecnej.
--
-- Change: In recalculate_pr_for_exercise, add WHERE personal_records.value < excluded.value
--         to each ON CONFLICT DO UPDATE so we only overwrite when the new value is greater.
--
-- Dependencies: 20260129140000_fix_recalculate_pr_set_number_group_by.sql
-- ============================================================================

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
    if p_exercise_id is null then
        return;
    end if;

    -- ========================================================================
    -- TOTAL REPS PR - update only when new total is greater
    -- ========================================================================
    select
        coalesce(sum(wss.reps), 0),
        max(wse.updated_at)
    into v_total_reps, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
        and wss.reps is not null and wss.reps > 0;

    if v_total_reps > 0 then
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
            and wss.reps is not null and wss.reps > 0
        group by wse.id, wse.session_id
        order by sum(wss.reps) desc, max(wse.updated_at) desc
        limit 1;

        if v_session_exercise_id is not null then
            select coalesce(
                jsonb_object_agg('S' || wss.set_number, wss.reps ORDER BY wss.set_number),
                '{}'::jsonb
            ) into v_series_values
            from workout_session_sets wss
            where wss.session_exercise_id = v_session_exercise_id
                and wss.reps is not null and wss.reps > 0;

            insert into personal_records (
                user_id, exercise_id, metric_type, value, series_values,
                achieved_at, achieved_in_session_id, achieved_in_set_number
            )
            select
                p_user_id, p_exercise_id, 'total_reps'::pr_metric_type,
                sum(wss.reps), v_series_values,
                max(wse.updated_at), wse.session_id, max(wss.set_number)
            from workout_session_exercises wse
            join workout_session_sets wss on wss.session_exercise_id = wse.id
            where wse.id = v_session_exercise_id
                and wss.reps is not null and wss.reps > 0
            group by wse.id, wse.session_id
            on conflict (user_id, exercise_id, metric_type)
            do update set
                value = excluded.value,
                series_values = excluded.series_values,
                achieved_at = excluded.achieved_at,
                achieved_in_session_id = excluded.achieved_in_session_id,
                achieved_in_set_number = excluded.achieved_in_set_number,
                updated_at = now()
            where personal_records.value < excluded.value;
        end if;
    end if;

    -- ========================================================================
    -- MAX DURATION PR - update only when new duration is greater
    -- ========================================================================
    select max(wss.duration_seconds), max(wse.updated_at)
    into v_max_duration, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
        and wss.duration_seconds is not null and wss.duration_seconds > 0;

    if v_max_duration > 0 then
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
            and wss.duration_seconds = v_max_duration and wss.duration_seconds > 0
        order by wse.updated_at desc
        limit 1;

        if v_session_exercise_id is not null then
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
                wse.updated_at, wse.session_id,
                (select wss2.set_number from workout_session_sets wss2
                 where wss2.session_exercise_id = v_session_exercise_id
                   and wss2.duration_seconds = v_max_duration
                 order by wss2.set_number limit 1)
            from workout_session_exercises wse
            where wse.id = v_session_exercise_id
            order by wse.updated_at desc
            limit 1
            on conflict (user_id, exercise_id, metric_type)
            do update set
                value = excluded.value,
                series_values = excluded.series_values,
                achieved_at = excluded.achieved_at,
                achieved_in_session_id = excluded.achieved_in_session_id,
                achieved_in_set_number = excluded.achieved_in_set_number,
                updated_at = now()
            where personal_records.value < excluded.value;
        end if;
    end if;

    -- ========================================================================
    -- MAX WEIGHT PR - update only when new weight is greater
    -- ========================================================================
    select max(wss.weight_kg), max(wse.updated_at)
    into v_max_weight, v_achieved_at
    from workout_session_exercises wse
    join workout_session_sets wss on wss.session_exercise_id = wse.id
    where wse.exercise_id = p_exercise_id
        and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
        and wss.weight_kg is not null and wss.weight_kg > 0;

    if v_max_weight > 0 then
        select wse.id into v_session_exercise_id
        from workout_session_exercises wse
        join workout_session_sets wss on wss.session_exercise_id = wse.id
        where wse.exercise_id = p_exercise_id
            and wse.session_id in (select id from workout_sessions where user_id = p_user_id)
            and wss.weight_kg = v_max_weight and wss.weight_kg > 0
        order by wse.updated_at desc
        limit 1;

        if v_session_exercise_id is not null then
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
                wse.updated_at, wse.session_id,
                (select wss2.set_number from workout_session_sets wss2
                 where wss2.session_exercise_id = v_session_exercise_id
                   and wss2.weight_kg = v_max_weight
                 order by wss2.set_number limit 1)
            from workout_session_exercises wse
            where wse.id = v_session_exercise_id
            order by wse.updated_at desc
            limit 1
            on conflict (user_id, exercise_id, metric_type)
            do update set
                value = excluded.value,
                series_values = excluded.series_values,
                achieved_at = excluded.achieved_at,
                achieved_in_session_id = excluded.achieved_in_session_id,
                achieved_in_set_number = excluded.achieved_in_set_number,
                updated_at = now()
            where personal_records.value < excluded.value;
        end if;
    end if;
end;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
