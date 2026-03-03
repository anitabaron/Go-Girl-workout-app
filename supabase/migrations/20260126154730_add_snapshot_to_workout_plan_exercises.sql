-- ============================================================================
-- Migration: Add Snapshot Fields to workout_plan_exercises
-- ============================================================================
-- Purpose: Enable storing exercises without existing exercise_id (for JSON import)
--          by adding snapshot fields (exercise_title, exercise_type, exercise_part)
--          and making exercise_id nullable.
--
-- Changes:
--   - Add snapshot columns: exercise_title, exercise_type, exercise_part
--   - Make exercise_id nullable (ON DELETE SET NULL instead of RESTRICT)
--   - Add constraint: if exercise_id IS NULL, snapshot must be filled
--   - Populate snapshot for existing records from exercises table
--
-- Dependencies:
--   - 20260108120002_create_workout_plans_tables.sql (workout_plan_exercises table)
--   - 20260108120001_create_exercises_table.sql (exercises table)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD SNAPSHOT COLUMNS
-- ----------------------------------------------------------------------------

-- Add exercise_title: snapshot of exercise title (required if exercise_id IS NULL)
alter table workout_plan_exercises
    add column if not exists exercise_title text;

-- Add exercise_type: snapshot of exercise type (required if exercise_id IS NULL)
alter table workout_plan_exercises
    add column if not exists exercise_type exercise_type;

-- Add exercise_part: snapshot of exercise part (required if exercise_id IS NULL)
alter table workout_plan_exercises
    add column if not exists exercise_part exercise_part;

-- ----------------------------------------------------------------------------
-- 2. POPULATE SNAPSHOT FOR EXISTING RECORDS
-- ----------------------------------------------------------------------------

-- Fill snapshot fields from exercises table for existing records
update workout_plan_exercises wpe
set 
    exercise_title = e.title,
    exercise_type = e.type,
    exercise_part = e.part
from exercises e
where wpe.exercise_id = e.id;

-- ----------------------------------------------------------------------------
-- 3. MAKE exercise_id NULLABLE
-- ----------------------------------------------------------------------------

-- Drop NOT NULL constraint on exercise_id
alter table workout_plan_exercises
    alter column exercise_id drop not null;

-- ----------------------------------------------------------------------------
-- 4. UPDATE FOREIGN KEY CONSTRAINT
-- ----------------------------------------------------------------------------

-- Drop old FK constraint (ON DELETE RESTRICT)
alter table workout_plan_exercises
    drop constraint if exists workout_plan_exercises_exercise_id_fkey;

-- Add new FK constraint with ON DELETE SET NULL
-- This allows plans to keep snapshot even if exercise is deleted
alter table workout_plan_exercises
    add constraint workout_plan_exercises_exercise_id_fkey
    foreign key (exercise_id)
    references exercises(id)
    on delete set null;

-- ----------------------------------------------------------------------------
-- 5. ADD CONSTRAINT: SNAPSHOT REQUIRED IF exercise_id IS NULL
-- ----------------------------------------------------------------------------

-- Drop if exists (idempotent - remote DB may already have it from manual/sync)
alter table workout_plan_exercises
    drop constraint if exists workout_plan_exercises_snapshot_check;

-- Fix rows that would violate: exercise_id NULL but exercise_title NULL
-- (can happen if remote had partial migrations or manual changes)
update workout_plan_exercises
set exercise_title = coalesce(exercise_title, '(bez tytułu)')
where exercise_id is null and exercise_title is null;

-- Constraint: if exercise_id IS NULL, snapshot must have at least exercise_title
-- (exercise_type, exercise_part are optional - relaxed in later migrations)
alter table workout_plan_exercises
    add constraint workout_plan_exercises_snapshot_check check (
        (exercise_id is not null) or (exercise_title is not null)
    );

-- ----------------------------------------------------------------------------
-- 6. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_plan_exercises.exercise_id is 
    'ID ćwiczenia z biblioteki użytkownika. Może być NULL dla importowanych planów z nieistniejącymi ćwiczeniami.';

comment on column workout_plan_exercises.exercise_title is 
    'Tytuł ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';

comment on column workout_plan_exercises.exercise_type is 
    'Typ ćwiczenia (snapshot). Wymagany jeśli exercise_id IS NULL.';

comment on column workout_plan_exercises.exercise_part is 
    'Partia mięśniowa (snapshot). Wymagany jeśli exercise_id IS NULL.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
