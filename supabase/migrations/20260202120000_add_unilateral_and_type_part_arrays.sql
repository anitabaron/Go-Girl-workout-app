-- ============================================================================
-- Migration: Add unilateral exercises + type/part as arrays
-- ============================================================================
-- Purpose:
--   1. Unilateral exercises: is_unilateral flag, exercise_is_unilateral_at_time
--      snapshot, side_number in workout_session_sets (1/2 for "strona 1/2")
--   2. type/part as arrays: exercises can have multiple types (Warm-up + Main)
--      and multiple parts (Legs + Core)
--
-- Changes:
--   - exercises: type -> types[], part -> parts[], add is_unilateral
--   - workout_session_exercises: add exercise_is_unilateral_at_time
--   - workout_session_sets: add side_number (1 or 2 for unilateral, null for bilateral)
--   - save_workout_session_exercise: use types[1], parts[1], is_unilateral,
--     handle side_number in sets_data
--
-- PR: No changes - recalculate_pr_for_exercise aggregates all sets regardless of side
--
-- Post-migration: Application must use types[1]/parts[1] when copying to snapshots.
-- Filtering: use .contains("types", [value]) and .contains("parts", [value])
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. exercises: type/part -> types/parts (arrays)
-- ----------------------------------------------------------------------------
-- Add new array columns
alter table exercises add column types exercise_type[] default null;
alter table exercises add column parts exercise_part[] default null;

-- Migrate existing data
update exercises set types = array[type]::exercise_type[], parts = array[part]::exercise_part[];

-- Make NOT NULL and add constraints
alter table exercises alter column types set not null;
alter table exercises alter column parts set not null;
alter table exercises add constraint exercises_types_not_empty
  check (array_length(types, 1) >= 1);
alter table exercises add constraint exercises_parts_not_empty
  check (array_length(parts, 1) >= 1);

-- Drop old columns
alter table exercises drop column type;
alter table exercises drop column part;

-- Update indexes: drop old (eq on single value), add GIN for array containment
drop index if exists idx_exercises_user_id_part;
drop index if exists idx_exercises_user_id_type;
create index idx_exercises_parts on exercises using gin (parts);
create index idx_exercises_types on exercises using gin (types);

comment on column exercises.types is 'Typy ćwiczenia: Warm-up, Main Workout, Cool-down (może być kilka)';
comment on column exercises.parts is 'Partie ciała: Legs, Core, Back, Arms, Chest (może być kilka)';

-- ----------------------------------------------------------------------------
-- 2. exercises: add is_unilateral
-- ----------------------------------------------------------------------------
alter table exercises
  add column if not exists is_unilateral boolean not null default false;

comment on column exercises.is_unilateral is 'Ćwiczenie jednostronne - wykonaj na obie strony (np. deska boczna, wznosy 1 nogi)';

-- ----------------------------------------------------------------------------
-- 3. workout_session_exercises: add exercise_is_unilateral_at_time
-- ----------------------------------------------------------------------------
alter table workout_session_exercises
  add column if not exists exercise_is_unilateral_at_time boolean not null default false;

comment on column workout_session_exercises.exercise_is_unilateral_at_time is 'Snapshot: czy ćwiczenie było unilateralne przy starcie sesji';

-- Backfill from exercises for existing session exercises
update workout_session_exercises wse
set exercise_is_unilateral_at_time = coalesce(e.is_unilateral, false)
from exercises e
where wse.exercise_id = e.id
  and wse.exercise_is_unilateral_at_time = false;

-- ----------------------------------------------------------------------------
-- 4. workout_session_sets: add side_number
-- ----------------------------------------------------------------------------
alter table workout_session_sets
  add column if not exists side_number smallint check (side_number is null or side_number in (1, 2));

comment on column workout_session_sets.side_number is 'Strona ćwiczenia unilateralnego: 1 = pierwsza strona, 2 = druga strona; null = bilateralne';

-- Drop old unique constraint, add new one with side_number
alter table workout_session_sets
  drop constraint if exists workout_session_sets_unique_number;

create unique index workout_session_sets_unique_session_side_set
  on workout_session_sets (session_exercise_id, coalesce(side_number, 0), set_number);

-- ----------------------------------------------------------------------------
-- 5. save_workout_session_exercise: full replacement
-- ----------------------------------------------------------------------------
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
    v_set_number integer;
    v_side_number smallint;
    v_loop_index integer := 0;
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
        if p_exercise_id is null then
            raise exception 'Cannot create session exercise: exercise_id is null';
        end if;
        insert into workout_session_exercises (
            session_id, exercise_id, exercise_order,
            exercise_title_at_time, exercise_type_at_time, exercise_part_at_time,
            exercise_is_unilateral_at_time,
            actual_sets, actual_reps, actual_duration_seconds, actual_rest_seconds,
            is_skipped
        )
        select
            p_session_id, p_exercise_id, p_exercise_order,
            e.title, e.types[1], e.parts[1],
            coalesce(e.is_unilateral, false),
            p_actual_sets, p_actual_reps, p_actual_duration_seconds, p_actual_rest_seconds,
            p_is_skipped
        from exercises e
        where e.id = p_exercise_id and e.user_id = v_user_id
        returning id into v_session_exercise_id;
    else
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
                v_loop_index := v_loop_index + 1;
                v_set_number := (v_set_item->>'set_number')::integer;
                v_side_number := (v_set_item->>'side_number')::smallint;

                if v_side_number is not null and v_side_number not in (1, 2) then
                    v_side_number := null;
                end if;
                if v_set_number is null then
                    v_set_number := v_loop_index;
                end if;

                insert into workout_session_sets (
                    session_exercise_id, set_number, side_number,
                    reps, duration_seconds, weight_kg
                )
                values (
                    v_session_exercise_id, v_set_number, v_side_number,
                    (v_set_item->>'reps')::integer,
                    (v_set_item->>'duration_seconds')::integer,
                    (v_set_item->>'weight_kg')::numeric
                );
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

-- ============================================================================
-- POST-MIGRATION: Required application updates
-- ============================================================================
-- 1. database.types.ts: Regenerate with `pnpm supabase gen types typescript`
-- 2. exercises: type/part -> types/parts in types, validation, API, forms
-- 3. createSessionSnapshots: use exercise.types[0], exercise.parts[0] for snapshot
-- 4. findExercisesByIdsForSnapshots: select types, parts (not type, part)
-- 5. Repository filter: .contains("parts", [part]) instead of .eq("part", part)
-- 6. Set logs: add side_number to SessionExerciseSetCommand, SetLogFormData
-- 7. callSaveWorkoutSessionExercise: include set_number, side_number in p_sets_data
-- ============================================================================
