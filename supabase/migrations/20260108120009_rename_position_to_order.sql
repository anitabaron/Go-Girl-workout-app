-- ============================================================================
-- Migration: Rename position to order in workout_session_exercises
-- ============================================================================
-- Purpose: Rename 'position' column to 'order' for better clarity
--          that it represents the order/sequence of exercises in a session
--
-- Changes:
--   - Rename column: position -> order
--   - Rename constraint: workout_session_exercises_unique_position -> workout_session_exercises_unique_order
--   - Rename index: idx_workout_session_exercises_session_position -> idx_workout_session_exercises_session_order
--   - Update function: save_workout_session_exercise (parameter and usage)
--
-- Dependencies:
--   - 20260108120003_create_workout_sessions_tables.sql
--   - 20260108120006_create_advanced_functions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RENAME COLUMN: position -> order
-- ----------------------------------------------------------------------------
alter table workout_session_exercises
    rename column position to "order";

-- ----------------------------------------------------------------------------
-- 2. RENAME CONSTRAINT: unique position -> unique order
-- ----------------------------------------------------------------------------
alter table workout_session_exercises
    rename constraint workout_session_exercises_unique_position
    to workout_session_exercises_unique_order;

-- ----------------------------------------------------------------------------
-- 3. DROP OLD INDEX
-- ----------------------------------------------------------------------------
drop index if exists idx_workout_session_exercises_session_position;

-- ----------------------------------------------------------------------------
-- 4. CREATE NEW INDEX with new column name
-- ----------------------------------------------------------------------------
create index idx_workout_session_exercises_session_order
    on workout_session_exercises(session_id, "order");

-- ----------------------------------------------------------------------------
-- 5. UPDATE FUNCTION: save_workout_session_exercise
-- ----------------------------------------------------------------------------
-- Change parameter name from p_position to p_order
-- and update all references to position -> order
-- Note: Must DROP and CREATE because PostgreSQL doesn't allow changing parameter names
drop function if exists save_workout_session_exercise(uuid, uuid, integer, integer, integer, integer, integer, boolean, jsonb);

create function save_workout_session_exercise(
    p_session_id uuid,
    p_exercise_id uuid,
    p_order integer,
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
    where session_id = p_session_id and "order" = p_order;

    if v_session_exercise_id is null then
        -- Create new entry (should already exist from snapshot, but handle edge case)
        insert into workout_session_exercises (
            session_id, exercise_id, "order",
            exercise_title_at_time, exercise_type_at_time, exercise_part_at_time,
            actual_sets, actual_reps, actual_duration_seconds, actual_rest_seconds,
            is_skipped
        )
        select
            p_session_id, p_exercise_id, p_order,
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
    set last_action_at = now(), current_position = p_order
    where id = p_session_id;

    return v_session_exercise_id;
end;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
