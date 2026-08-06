-- Allow negative weight_kg on workout_session_sets.
--
-- Some exercises use assistance/counterweight loads instead of added weight
-- (e.g. Assisted Pull-up: a bigger assist means an easier set, so the value
-- is recorded as negative — smaller/more negative is "more assisted", the
-- opposite convention from normal added weight). The previous CHECK
-- (weight_kg IS NULL OR weight_kg >= 0) blocked this.
alter table workout_session_sets
  drop constraint if exists workout_session_sets_weight_kg_check;
