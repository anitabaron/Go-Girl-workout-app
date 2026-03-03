-- ============================================================================
-- Migration: Fix save_workout_session_exercise and recalculate_pr_for_exercise
-- ============================================================================
-- Purpose: Fix regression - PATCH exercises returns 500 when saving
--
-- Root causes:
--   1. save_workout_session_exercise: When p_exercise_id is NULL (snapshot-only
--      exercises), recalculate_pr_for_exercise fails - add guard to skip it
--   2. recalculate_pr_for_exercise: When v_session_exercise_id is NULL (e.g.
--      multiple sessions with reps, "having sum = v_total_reps" matches none),
--      jsonb_object_agg and INSERT with NULL can cause issues - add guard
--
-- Changes:
--   - save_workout_session_exercise: Accept NULL p_exercise_id, skip recalculate when null
--   - recalculate_pr_for_exercise: Early return when p_exercise_id is null
--   - recalculate_pr_for_exercise: Guard before jsonb/INSERT when v_session_exercise_id is null
--   - recalculate_pr_for_exercise: Fix total_reps logic - pick session with MAX sum
--     (not sum = v_total_reps which fails when reps are split across sessions)
--
-- Dependencies:
--   - 20260115120000_fix_empty_sets_handling.sql
--   - 20260129120000_add_series_values_to_personal_records.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE save_workout_session_exercise: Skip recalculate when p_exercise_id is null
-- ----------------------------------------------------------------------------
drop function if exists save_workout_session_exercise(uuid, uuid, integer, integer, integer, integer, integer, boolean, jsonb);

create function save_workout_session_exercise(
    p_session_id uuid,
    p_exercise_id uuid,  -- Can be NULL for snapshot-only exercises
    p_exercise_order integer,
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
    -- SECURITY CHECK
    select user_id into v_user_id from workout_sessions where id = p_session_id;
    if v_user_id is null then
        raise exception 'Session not found';
    end if;
    if v_user_id != auth.uid() then
        raise exception 'Access denied';
    end if;

    -- GET OR CREATE SESSION EXERCISE
    select id into v_session_exercise_id
    from workout_session_exercises
    where session_id = p_session_id and exercise_order = p_exercise_order;

    if v_session_exercise_id is null then
        -- Create new entry (only when p_exercise_id is not null - need exercises table)
        if p_exercise_id is null then
            raise exception 'Cannot create session exercise: exercise_id is null';
        end if;
        insert into workout_session_exercises (
            session_id, exercise_id, exercise_order,
            exercise_title_at_time, exercise_type_at_time, exercise_part_at_time,
            actual_sets, actual_reps, actual_duration_seconds, actual_rest_seconds,
            is_skipped
        )
        select
            p_session_id, p_exercise_id, p_exercise_order,
            e.title, e.type, e.part,
            p_actual_sets, p_actual_reps, p_actual_duration_seconds, p_actual_rest_seconds,
            p_is_skipped
        from exercises e
        where e.id = p_exercise_id and e.user_id = v_user_id
        returning id into v_session_exercise_id;
    else
        -- Update existing entry
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

    -- HANDLE SETS DATA
    if p_sets_data is not null then
        delete from workout_session_sets where session_exercise_id = v_session_exercise_id;
        if jsonb_array_length(p_sets_data) > 0 then
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
    end if;

    -- RECALCULATE PERSONAL RECORDS (only when exercise has library reference)
    if p_exercise_id is not null then
        perform recalculate_pr_for_exercise(v_user_id, p_exercise_id);
    end if;

    -- UPDATE SESSION PROGRESS
    update workout_sessions
    set last_action_at = now(), current_position = p_exercise_order
    where id = p_session_id;

    return v_session_exercise_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. UPDATE recalculate_pr_for_exercise: Handle null + fix session selection
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
    -- Skip when exercise_id is null (snapshot-only exercises have no PR)
    if p_exercise_id is null then
        return;
    end if;

    -- ========================================================================
    -- TOTAL REPS PR - Pick session with MAX sum (not sum = v_total_reps)
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
        -- Get session_exercise with MAX sum of reps (best single-session total)
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
            -- Build series_values (ORDER BY inside aggregate to avoid GROUP BY error)
            select coalesce(
                jsonb_object_agg('S' || wss.set_number, wss.reps ORDER BY wss.set_number),
                '{}'::jsonb
            ) into v_series_values
            from workout_session_sets wss
            where wss.session_exercise_id = v_session_exercise_id
                and wss.reps is not null and wss.reps > 0;

            -- Use max sum per session for PR value (best single session)
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
    end if;

    -- ========================================================================
    -- MAX DURATION PR
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
                wse.updated_at, wse.session_id, wss.set_number
            from workout_session_exercises wse
            join workout_session_sets wss on wss.session_exercise_id = wse.id
            where wse.exercise_id = p_exercise_id and wse.id = v_session_exercise_id
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
    end if;

    -- ========================================================================
    -- MAX WEIGHT PR
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
                wse.updated_at, wse.session_id, wss.set_number
            from workout_session_exercises wse
            join workout_session_sets wss on wss.session_exercise_id = wse.id
            where wse.exercise_id = p_exercise_id and wse.id = v_session_exercise_id
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
    end if;
end;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
