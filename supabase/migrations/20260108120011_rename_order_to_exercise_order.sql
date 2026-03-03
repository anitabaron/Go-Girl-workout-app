-- ============================================================================
-- Migration: Rename order to exercise_order in workout_session_exercises
-- ============================================================================
-- Purpose: Rename 'order' column to 'exercise_order' to avoid conflicts
--          with PostgreSQL reserved keyword 'order' which causes parsing
--          errors in Supabase PostgREST
--
-- Changes:
--   - Rename column: order -> exercise_order
--   - Rename constraint: workout_session_exercises_unique_order -> workout_session_exercises_unique_exercise_order
--   - Rename index: idx_workout_session_exercises_session_order -> idx_workout_session_exercises_session_exercise_order
--   - Update function: save_workout_session_exercise (parameter and usage)
--
-- Dependencies:
--   - 20260108120009_rename_position_to_order.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RENAME COLUMN: order -> exercise_order
-- ----------------------------------------------------------------------------
alter table workout_session_exercises
    rename column "order" to exercise_order;

-- ----------------------------------------------------------------------------
-- 2. RENAME CONSTRAINT: unique order -> unique exercise_order
-- ----------------------------------------------------------------------------
alter table workout_session_exercises
    rename constraint workout_session_exercises_unique_order
    to workout_session_exercises_unique_exercise_order;

-- ----------------------------------------------------------------------------
-- 3. DROP OLD INDEX
-- ----------------------------------------------------------------------------
drop index if exists idx_workout_session_exercises_session_order;

-- ----------------------------------------------------------------------------
-- 4. CREATE NEW INDEX with new column name
-- ----------------------------------------------------------------------------
create index idx_workout_session_exercises_session_exercise_order
    on workout_session_exercises(session_id, exercise_order);

-- ----------------------------------------------------------------------------
-- 5. UPDATE FUNCTION: save_workout_session_exercise
-- ----------------------------------------------------------------------------
-- Change parameter name from p_order to p_exercise_order
-- and update all references to order -> exercise_order
-- Note: Must DROP and CREATE because PostgreSQL doesn't allow changing parameter names
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
    select id into v_session_exercise_id
    from workout_session_exercises
    where session_id = p_session_id and exercise_order = p_exercise_order;

    if v_session_exercise_id is null then
        -- Create new entry (should already exist from snapshot, but handle edge case)
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
    set last_action_at = now(), current_position = p_exercise_order
    where id = p_session_id;

    return v_session_exercise_id;
end;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
