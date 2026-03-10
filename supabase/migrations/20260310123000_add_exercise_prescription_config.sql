-- ============================================================================
-- Migration: Add exercise prescription_config metadata
-- ============================================================================
-- Purpose: Store per-exercise guardrails used by AI planner/validator.
--
-- Changes:
--   - Add exercises.prescription_config jsonb
--   - Backfill existing exercises with conservative defaults derived from
--     current reps/duration/series/rest and title heuristics
-- ============================================================================

alter table exercises
  add column if not exists prescription_config jsonb;

update exercises
set prescription_config = jsonb_build_object(
  'prescription_mode',
    case
      when reps is not null then 'reps_based'
      when lower(coalesce(title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
        then 'duration_based_isometric'
      else 'duration_based_dynamic'
    end,
  'min_sets', greatest(1, least(coalesce(series, 3) - 1, 6)),
  'max_sets', least(6, greatest(coalesce(series, 3) + 1, 4)),
  'min_reps',
    case
      when reps is not null then greatest(1, reps - 4)
      else null
    end,
  'max_reps',
    case
      when reps is not null then least(30, greatest(reps + 4, 8))
      else null
    end,
  'min_duration_seconds',
    case
      when reps is not null then null
      when lower(coalesce(title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
        then greatest(10, coalesce(duration_seconds, 15) - 5)
      else greatest(10, coalesce(duration_seconds, 30) - 10)
    end,
  'max_duration_seconds',
    case
      when reps is not null then null
      when lower(coalesce(title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
        then least(45, coalesce(duration_seconds, 15) + 10)
      else least(120, coalesce(duration_seconds, 30) + 20)
    end,
  'min_rest_seconds', greatest(15, coalesce(rest_in_between_seconds, 60) - 15),
  'max_rest_seconds', least(180, greatest(coalesce(rest_in_between_seconds, 60) + 45, 45)),
  'progression_step_reps',
    case
      when reps is not null and reps >= 15 then 1
      when reps is not null then 2
      else null
    end,
  'progression_step_duration_seconds',
    case
      when reps is not null then null
      when lower(coalesce(title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
        then 2
      else 5
    end,
  'progression_step_load_percent', 5
)
where prescription_config is null;

comment on column exercises.prescription_config is
  'Per-exercise guardrails for AI planning and progression: mode, min/max sets/reps/duration/rest, progression steps.';
