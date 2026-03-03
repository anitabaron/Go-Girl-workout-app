-- ============================================================================
-- Migration: Update snapshot_id for title-only snapshots
-- ============================================================================
-- Purpose: Update snapshot_id generation to work with title-only snapshots.
--          Previously, snapshot_id was generated based on title + type + part.
--          Now it should work with title only (type and part are optional).
--
-- Changes:
--   - Regenerate snapshot_id for snapshots that only have exercise_title
--   - Group snapshots by exercise_title only (if type/part are NULL)
--   - Update existing snapshot_id to use title-only grouping where appropriate
--
-- Dependencies:
--   - 20260127115701_make_exercise_part_optional_in_snapshot.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REGENERATE snapshot_id FOR TITLE-ONLY SNAPSHOTS
-- ----------------------------------------------------------------------------

-- Dla snapshotów, które mają tylko exercise_title (bez exercise_type lub exercise_part),
-- wygeneruj nowy snapshot_id na podstawie tylko exercise_title

-- Krok 1: Utwórz mapę unikalnych snapshotów (tylko title) do UUID
CREATE TEMP TABLE snapshot_id_map_title_only AS
SELECT DISTINCT
    exercise_title,
    gen_random_uuid() as snapshot_id
FROM workout_plan_exercises
WHERE exercise_id IS NULL
  AND exercise_title IS NOT NULL
  AND (exercise_type IS NULL OR exercise_part IS NULL);

-- Krok 2: Zaktualizuj snapshot_id dla snapshotów z tylko title
UPDATE workout_plan_exercises wpe
SET snapshot_id = sim.snapshot_id
FROM snapshot_id_map_title_only sim
WHERE wpe.exercise_id IS NULL
  AND wpe.exercise_title = sim.exercise_title
  AND (wpe.exercise_type IS NULL OR wpe.exercise_part IS NULL)
  AND wpe.snapshot_id IS NULL;

-- Krok 3: Usuń tabelę tymczasową
DROP TABLE snapshot_id_map_title_only;

-- ----------------------------------------------------------------------------
-- 2. UPDATE EXISTING SNAPSHOTS TO USE TITLE-ONLY GROUPING WHERE APPROPRIATE
-- ----------------------------------------------------------------------------

-- Dla snapshotów, które mają exercise_title ale brakuje exercise_type lub exercise_part,
-- zaktualizuj snapshot_id, aby używał tylko exercise_title do grupowania

-- Utwórz mapę dla wszystkich snapshotów z title (bez type lub part)
CREATE TEMP TABLE snapshot_id_map_all AS
SELECT DISTINCT
    exercise_title,
    gen_random_uuid() as snapshot_id
FROM workout_plan_exercises
WHERE exercise_id IS NULL
  AND exercise_title IS NOT NULL
  AND (exercise_type IS NULL OR exercise_part IS NULL);

-- Zaktualizuj wszystkie wystąpienia, które mają ten sam title (ale różne type/part lub NULL)
UPDATE workout_plan_exercises wpe
SET snapshot_id = sim.snapshot_id
FROM snapshot_id_map_all sim
WHERE wpe.exercise_id IS NULL
  AND wpe.exercise_title = sim.exercise_title
  AND (wpe.exercise_type IS NULL OR wpe.exercise_part IS NULL);

DROP TABLE snapshot_id_map_all;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
