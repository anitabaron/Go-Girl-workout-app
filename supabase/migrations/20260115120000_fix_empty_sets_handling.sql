-- ============================================================================
-- Migration: Fix empty sets handling in save_workout_session_exercise
-- ============================================================================
-- Purpose: Fix the logic to handle empty array [] as a signal to clear all sets
--          when is_skipped = true
--
-- Changes:
--   - Update function: save_workout_session_exercise to handle empty array []
--     as a signal to delete all existing sets (not just ignore it)
--   - FIXED: Use p_exercise_order and exercise_order (not p_order and "order")
--     to match column rename in migration 20260108120011
--
-- Dependencies:
--   - 20260108120011_rename_order_to_exercise_order.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- UPDATE FUNCTION: save_workout_session_exercise
-- ----------------------------------------------------------------------------
-- Fix the logic to handle empty array [] as a signal to clear all sets
-- When p_sets_data is:
--   - null: don't change existing sets
--   - [] (empty array): delete all existing sets (for skipped exercises)
--   - [items]: delete old sets and insert new ones
-- FIXED: Use p_exercise_order parameter and exercise_order column
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
                    (v_set_item->>'reps')::integer,
                    (v_set_item->>'duration_seconds')::integer,
                    (v_set_item->>'weight_kg')::numeric
                );
                v_set_number := v_set_number + 1;
            end loop;
        end if;
        -- If p_sets_data is [] (empty array), we've deleted all sets and won't insert any
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

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
