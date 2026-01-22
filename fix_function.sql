-- ============================================================================
-- FIX: Update save_workout_session_exercise function
-- ============================================================================
-- Execute this in Supabase SQL Editor to fix the function
-- This will NOT destroy any data - it only updates the function definition
-- ============================================================================

drop function if exists save_workout_session_exercise(uuid, uuid, integer, integer, integer, integer, integer, boolean, jsonb);

create function save_workout_session_exercise(
    p_session_id uuid,
    p_exercise_id uuid,
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
    v_set_count integer;
    v_reps_sum integer;
    v_duration_max integer;
    v_planned_reps integer;
    v_planned_duration integer;
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
    -- FIXED: Use exercise_order (not "order") - column was renamed in migration 20260108120011
    select id into v_session_exercise_id
    from workout_session_exercises
    where session_id = p_session_id and exercise_order = p_exercise_order;

    if v_session_exercise_id is null then
        -- Create new entry (should already exist from snapshot, but handle edge case)
        -- FIXED: Use exercise_order (not "order")
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
        -- Update existing entry with new actual values
        -- If p_actual_sets/p_actual_reps are provided, use them; otherwise keep existing values
        -- But if sets_data is provided, we'll recalculate aggregates from sets after inserting them
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
    -- FIXED: Handle empty array [] as a signal to delete all sets
    -- When p_sets_data is:
    --   - null: don't change existing sets (leave them as is)
    --   - [] (empty array): delete all existing sets (for skipped exercises)
    --   - [items]: delete old sets and insert new ones
    if p_sets_data is not null then
        -- DESTRUCTIVE: Remove existing sets (whether replacing with new data or clearing)
        delete from workout_session_sets
        where session_exercise_id = v_session_exercise_id;

        -- Only insert new sets if the array is not empty
        if jsonb_array_length(p_sets_data) > 0 then
            -- Insert new sets from JSON array
            for v_set_item in select * from jsonb_array_elements(p_sets_data)
            loop
                insert into workout_session_sets (
                    session_exercise_id, set_number,
                    reps, duration_seconds, weight_kg
                )
                values (
                    v_session_exercise_id, v_set_number,
                    -- Handle NULL values: nullif converts 'null' string to NULL, then cast to integer/numeric
                    -- If key is missing, ->'reps' returns NULL, nullif returns NULL, cast returns NULL (OK)
                    nullif(v_set_item->>'reps', 'null')::integer,
                    nullif(v_set_item->>'duration_seconds', 'null')::integer,
                    nullif(v_set_item->>'weight_kg', 'null')::numeric
                );
                v_set_number := v_set_number + 1;
            end loop;
        end if;
        -- If p_sets_data is [] (empty array), we've deleted all sets and won't insert any
        
        -- Recalculate aggregates from sets if they were provided and p_actual_sets/p_actual_reps were not explicitly provided
        if p_actual_sets is null or p_actual_reps is null or p_actual_duration_seconds is null then
            -- Count sets
            select count(*) into v_set_count
            from workout_session_sets
            where session_exercise_id = v_session_exercise_id;
            
            -- Update actual_sets if not explicitly provided
            if p_actual_sets is null and v_set_count > 0 then
                update workout_session_exercises
                set actual_sets = v_set_count
                where id = v_session_exercise_id;
            end if;
            
            -- Get planned values from workout_session_exercises to determine what to calculate
            -- FIXED: planned_reps and planned_duration_seconds are stored in workout_session_exercises, not exercises
            select planned_reps, planned_duration_seconds 
            into v_planned_reps, v_planned_duration
            from workout_session_exercises
            where id = v_session_exercise_id;
            
            -- Calculate sum of reps if exercise has planned_reps (reps-based exercise)
            if v_planned_reps is not null and p_actual_reps is null then
                select coalesce(sum(reps), 0) into v_reps_sum
                from workout_session_sets
                where session_exercise_id = v_session_exercise_id
                and reps is not null;
                
                if v_reps_sum > 0 then
                    update workout_session_exercises
                    set actual_reps = v_reps_sum
                    where id = v_session_exercise_id;
                end if;
            end if;
            
            -- Calculate max duration if exercise has planned_duration_seconds (time-based exercise)
            if v_planned_duration is not null and p_actual_duration_seconds is null then
                select coalesce(max(duration_seconds), 0) into v_duration_max
                from workout_session_sets
                where session_exercise_id = v_session_exercise_id
                and duration_seconds is not null;
                
                if v_duration_max > 0 then
                    update workout_session_exercises
                    set actual_duration_seconds = v_duration_max
                    where id = v_session_exercise_id;
                end if;
            end if;
        end if;
    end if;
    -- If p_sets_data is null, we don't touch the existing sets at all

    -- ========================================================================
    -- RECALCULATE PERSONAL RECORDS
    -- ========================================================================
    perform recalculate_pr_for_exercise(v_user_id, p_exercise_id);

    -- ========================================================================
    -- UPDATE SESSION PROGRESS
    -- ========================================================================
    -- FIXED: Use p_exercise_order (not p_order)
    update workout_sessions
    set last_action_at = now(), current_position = p_exercise_order
    where id = p_session_id;

    return v_session_exercise_id;
end;
$$;
