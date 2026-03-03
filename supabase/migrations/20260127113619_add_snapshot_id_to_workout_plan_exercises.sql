-- ============================================================================
-- Migration: Add snapshot_id to workout_plan_exercises
-- ============================================================================
-- Purpose: Add snapshot_id UUID column to group identical snapshots together.
--          This enables efficient bulk updates when adding snapshots to the
--          exercise library. All occurrences of the same snapshot will share
--          the same snapshot_id, allowing single-query updates.
--
-- Changes:
--   - Add snapshot_id UUID column (nullable)
--   - Update constraint to include snapshot_id
--   - Add index on snapshot_id for performance
--
-- Dependencies:
--   - 20260126154730_add_snapshot_to_workout_plan_exercises.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD snapshot_id COLUMN
-- ----------------------------------------------------------------------------

-- Add snapshot_id: UUID identifying unique snapshots (same snapshot = same UUID)
alter table workout_plan_exercises
    add column if not exists snapshot_id uuid;

-- ----------------------------------------------------------------------------
-- 2. POPULATE snapshot_id FOR EXISTING SNAPSHOTS
-- ----------------------------------------------------------------------------

-- Dla wszystkich istniejących snapshotów (exercise_id IS NULL) wygeneruj snapshot_id
-- Ten sam snapshot (title + type + part) = ten sam UUID
-- Używamy podejścia z pomocniczą tabelą tymczasową

-- Krok 1: Utwórz mapę unikalnych snapshotów do UUID
-- Uwaga: exercise_type jest opcjonalne (zgodnie z migracją 20260127104622)
-- Więc grupowanie odbywa się tylko po exercise_title i exercise_part
CREATE TEMP TABLE snapshot_id_map AS
SELECT DISTINCT
    exercise_title,
    exercise_type,  -- Może być NULL, ale uwzględniamy w grupowaniu
    exercise_part,
    gen_random_uuid() as snapshot_id
FROM workout_plan_exercises
WHERE exercise_id IS NULL
  AND exercise_title IS NOT NULL
  AND exercise_part IS NOT NULL
  AND snapshot_id IS NULL;

-- Krok 2: Zaktualizuj wszystkie wystąpienia każdego unikalnego snapshotu
-- Dopasowanie: exercise_title, exercise_part, oraz exercise_type (może być NULL)
UPDATE workout_plan_exercises wpe
SET snapshot_id = sim.snapshot_id
FROM snapshot_id_map sim
WHERE wpe.exercise_id IS NULL
  AND wpe.exercise_title = sim.exercise_title
  AND (wpe.exercise_type = sim.exercise_type OR (wpe.exercise_type IS NULL AND sim.exercise_type IS NULL))
  AND wpe.exercise_part = sim.exercise_part
  AND wpe.snapshot_id IS NULL;

-- Krok 3: Usuń tabelę tymczasową
DROP TABLE snapshot_id_map;

-- ----------------------------------------------------------------------------
-- 2.5. FIX INVALID ROWS (exercise_id IS NULL but missing snapshot fields)
-- ----------------------------------------------------------------------------

-- Jeśli są wiersze z exercise_id IS NULL, które nie mają wymaganych pól snapshotu,
-- spróbuj wypełnić je z tabeli exercises (jeśli exercise_id był wcześniej ustawiony)
-- lub ustaw placeholder values

-- Opcja 1: Spróbuj wypełnić snapshot z exercises, jeśli exercise_id był wcześniej ustawiony
-- (to może się zdarzyć, jeśli ćwiczenie zostało usunięte i FK constraint ustawił exercise_id na NULL)
UPDATE workout_plan_exercises wpe
SET 
    exercise_title = COALESCE(wpe.exercise_title, 'Nieznane ćwiczenie'),
    exercise_part = COALESCE(wpe.exercise_part, 'Legs')
WHERE wpe.exercise_id IS NULL
  AND (wpe.exercise_title IS NULL OR wpe.exercise_part IS NULL);

-- Opcja 2: Dla wierszy, które nadal nie mają exercise_title lub exercise_part,
-- ustaw wartości placeholder (lepsze niż błąd migracji)
UPDATE workout_plan_exercises wpe
SET 
    exercise_title = COALESCE(wpe.exercise_title, 'Nieznane ćwiczenie'),
    exercise_part = COALESCE(wpe.exercise_part, 'Legs')
WHERE wpe.exercise_id IS NULL
  AND (wpe.exercise_title IS NULL OR wpe.exercise_part IS NULL);

-- Teraz wygeneruj snapshot_id dla wszystkich wierszy, które go jeszcze nie mają
-- (w tym dla tych, które właśnie naprawiliśmy)
CREATE TEMP TABLE snapshot_id_map_fix AS
SELECT DISTINCT
    exercise_title,
    exercise_type,
    exercise_part,
    gen_random_uuid() as snapshot_id
FROM workout_plan_exercises
WHERE exercise_id IS NULL
  AND exercise_title IS NOT NULL
  AND exercise_part IS NOT NULL
  AND snapshot_id IS NULL;

UPDATE workout_plan_exercises wpe
SET snapshot_id = sim.snapshot_id
FROM snapshot_id_map_fix sim
WHERE wpe.exercise_id IS NULL
  AND wpe.exercise_title = sim.exercise_title
  AND (wpe.exercise_type = sim.exercise_type OR (wpe.exercise_type IS NULL AND sim.exercise_type IS NULL))
  AND wpe.exercise_part = sim.exercise_part
  AND wpe.snapshot_id IS NULL;

DROP TABLE snapshot_id_map_fix;

-- ----------------------------------------------------------------------------
-- 3. UPDATE CONSTRAINT TO INCLUDE snapshot_id
-- ----------------------------------------------------------------------------

-- Drop old constraint
alter table workout_plan_exercises
    drop constraint if exists workout_plan_exercises_snapshot_check;

-- Add new constraint: if exercise_id IS NULL, then snapshot_id and required snapshot fields must be filled
-- Uwaga: exercise_type jest opcjonalne (zgodnie z migracją 20260127104622)
-- Wymagane są tylko: snapshot_id, exercise_title, exercise_part
alter table workout_plan_exercises
    add constraint workout_plan_exercises_snapshot_check check (
        (exercise_id is not null) or 
        (snapshot_id is not null and
         exercise_title is not null and 
         exercise_part is not null)
    );

-- ----------------------------------------------------------------------------
-- 4. ADD INDEX FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index for efficient lookups by snapshot_id (used when updating all occurrences)
create index if not exists idx_workout_plan_exercises_snapshot_id 
    on workout_plan_exercises(snapshot_id) 
    where snapshot_id is not null;

-- ----------------------------------------------------------------------------
-- 5. COMMENTS FOR DOCUMENTATION
-- ----------------------------------------------------------------------------

comment on column workout_plan_exercises.snapshot_id is 
    'UUID identyfikujący unikalny snapshot. Wszystkie wystąpienia tego samego snapshotu (title + type + part) mają ten sam snapshot_id. Umożliwia masową aktualizację przy dodawaniu snapshotu do bazy ćwiczeń. NULL dla ćwiczeń z biblioteki (exercise_id IS NOT NULL).';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
