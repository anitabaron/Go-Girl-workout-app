# Design: Import Workout Session

## (a) Reuse of the plan-importer's exercise-identification union
`workoutPlanExerciseImportSchema` (in `src/lib/validation/workout-plans.ts`) already validates the
exact union we need per exercise line: `exercise_id` XOR `match_by_name` XOR `exercise_title` (+
optional `exercise_type`/`exercise_part`/`exercise_details`/`exercise_is_unilateral`), plus the shared
planned_* fields. Rather than re-implement this validation, the new session schema
(`workoutSessionImportExerciseSchema` in `src/lib/validation/workout-sessions.ts`) is a thin wrapper:
it imports and reuses `workoutPlanExerciseImportSchema` directly as the per-exercise schema (same
`.strict().superRefine(...)` exclusivity checks apply verbatim), and only adds a session-level
wrapper object (`name`, `description`, `part`, `exercises: [...]`).

Resolution logic (`match_by_name` → DB lookup → snapshot fallback; missing `exercise_id` → convert
to snapshot; enrichment of `planned_*` from the matched library exercise) is **duplicated** rather
than imported from `src/services/workout-plans.ts`, because those helpers are private
(non-exported) module-level functions tightly coupled to `WorkoutPlanImportPayload`. Extracting them
into a shared module was judged not worth the risk of destabilizing the working plan-import feature
under this change's scope; the session service's equivalent helpers
(`resolveMatchByNameForSession`, `enrichAndConvertMissingForSession`, etc., in
`src/services/workout-sessions.ts`) carry a comment block pointing back at
`src/services/workout-plans.ts` (`resolveOneMatchByName`, `enrichExerciseFromLibrary`,
`convertMissingExerciseToSnapshot`) as the canonical reference implementation, so a future refactor
can extract a shared `src/lib/workout-import/resolve-exercises.ts` helper used by both.

One deliberate simplification vs. the plan importer: session import does **not** support the plan
importer's `scope_id` / `in_scope_nr` / `scope_repeat_count` (superset/circuit) grouping semantics.
A completed session is a flat, already-performed sequence of exercises; those fields are accepted by
the reused schema (for JSON compatibility, e.g. pasting the same file used for a plan) but are
ignored — each JSON exercise entry becomes exactly one `workout_session_exercises` row, in array
order.

## (b) Planned → actual mapping (JSON has no "actual" data)
The import JSON only carries *prescription* fields (`planned_sets`, `planned_reps`,
`planned_duration_seconds`, `planned_rest_seconds`, `planned_rest_after_series_seconds`). A completed
session, however, is defined by *performed* data: `workout_session_exercises.actual_*` and one
`workout_session_sets` row per set actually done. Since Anita is importing a workout she already did
exactly as planned (no partial completion, no PR-hunting override), we treat planned as actual:

- `workout_session_exercises.actual_sets = planned_sets` (defaults to 3 if omitted, matching the plan
  importer's `DEFAULT_EXERCISE_VALUE.planned_sets`).
- `workout_session_exercises.actual_reps = planned_reps` (per-set value; the "aggregate" actual_reps
  column follows the same convention used by `calculateAggregatesFromSets` — sum across sets when reps
  are used, otherwise null).
- `workout_session_exercises.actual_duration_seconds = planned_duration_seconds` analogously.
- Each `workout_session_sets` row: `reps = planned_reps`, `duration_seconds = planned_duration_seconds`,
  **`weight_kg = null` always** — the import JSON has no weight field at all (Anita's real JSON is
  bodyweight/calisthenics-style: reps/duration + resistance-band exercises with no logged load), so we
  never invent a weight PR. This means `max_weight` personal records are never created/updated by this
  import path — only `total_reps` and `max_duration` can be affected, which matches what the source
  data actually contains.
- An exercise line needs *at least one* of `planned_reps` / `planned_duration_seconds` (after
  library enrichment) to produce a valid set row (the DB constraint
  `workout_session_sets_metric_check` requires at least one non-null metric). If neither is available
  after enrichment, the service throws `BAD_REQUEST` naming the offending exercise (title + position)
  rather than silently guessing.

## (c) Session-level fields
- `name` (from JSON `name`) is stored as `workout_sessions.plan_name_at_time` — there is no dedicated
  "session name" column; existing sessions already repurpose this snapshot column to display a
  human name in the list UI even when there is no linked plan (see `recoverWorkoutPlansFromSessions*`
  for a similar precedent of treating `plan_name_at_time` as free text).
- `workout_plan_id = null` — an imported session is intentionally *not* linked to any
  `workout_plans` row (there is no plan; Anita explicitly does not want one created). This is exactly
  the scenario the existing "recover plan from session" feature (`recoverWorkoutPlansFromSessionsService`)
  was built for, so if Anita later wants a reusable template from this session, that feature covers it
  for free.
- `status = 'completed'` directly (skipping `in_progress`) — this bypasses the partial unique index
  `idx_workout_sessions_user_in_progress` (which only applies `where status = 'in_progress'`), so
  importing a completed session never conflicts with, or interferes with, an active in-progress
  session.
- `started_at` and `completed_at` are both set to **import time** (`now()`), not any date encoded in
  the JSON (there is none). This is a known limitation — the session will show up dated "today" in
  history rather than whenever Anita actually did the workout. Documented as a limitation on the
  `/import-instruction` page. A future enhancement could accept an optional `performed_at` field and
  set both timestamps from it; deliberately deferred to keep this change small (no such field exists
  in Anita's current JSON).

## (d) Personal record recalculation
There is **no DB trigger** on `INSERT INTO workout_session_sets` that recalculates PRs automatically.
PR recalculation is performed by explicitly calling the `recalculate_pr_for_exercise(p_user_id,
p_exercise_id)` Postgres function (`SECURITY DEFINER`), which is itself invoked today only from
inside `save_workout_session_exercise` (the RPC the live "autosave during a session" flow calls per
exercise). That function requires the `workout_session_exercises` row to already exist (matched by
`session_id` + `exercise_order`) when `p_exercise_id` is null (snapshot-only exercises), and re-creates
it from the `exercises` table otherwise — behavior tuned for the live autosave flow, not bulk import.

For import, we insert `workout_sessions`, `workout_session_exercises`, and `workout_session_sets` rows
directly via repository inserts (batch, one round trip each) rather than looping
`save_workout_session_exercise` once per exercise — it is both simpler and avoids re-deriving
`exercise_title_at_time`/`exercise_type_at_time`/`exercise_part_at_time` a second time from the
`exercises` table. We then explicitly call `recalculate_pr_for_exercise` once per **unique**
`exercise_id` present in the import (skipping null/snapshot-only exercises, exactly as
`save_workout_session_exercise` does) via `supabase.rpc("recalculate_pr_for_exercise", ...)`. This
function already only *updates* a PR when the new value is strictly greater
(`20260210120000_pr_update_only_when_better.sql`), so importing an old, unremarkable workout can never
regress an existing PR — confirmed by reading the function body, not assumed.
