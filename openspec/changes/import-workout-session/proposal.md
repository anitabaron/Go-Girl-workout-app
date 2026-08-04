# Import Workout Session (from JSON)

## Why
Anita (the end user) already has a "import workout PLAN" feature: pasting/uploading a JSON blob with
`{ name, description, part, exercises: [...] }` creates a `WorkoutPlan` (a reusable template). She
tried to use this to log a workout she had *already completed* and was confused when it created a
plan instead of a completed session showing up in `/workout-sessions`. She explicitly asked for a new,
separate capability: paste the same kind of JSON and have it land directly as an **already-completed
workout session**, so it shows up immediately in her session history with personal records recalculated,
without her having to start a session, click through every exercise, and log every set by hand.

## What Changes
- Add a new **session import** capability, entirely additive, parallel to (not replacing) the existing
  plan import:
  - New Zod schema (`workoutSessionImportSchema` in `src/lib/validation/workout-sessions.ts`) that
    reuses the plan importer's exercise-identification union
    (`workoutPlanExerciseImportSchema` from `src/lib/validation/workout-plans.ts`) so the same JSON
    shape Anita already uses for exercises works unchanged.
  - New service `importWorkoutSessionService` (`src/services/workout-sessions.ts`) that:
    1. Validates the payload.
    2. Resolves each exercise line against the exercise library exactly like the plan importer
       (`exercise_id` / `match_by_name` / `exercise_title` snapshot), including enrichment of
       missing planned reps/sets/duration from the library exercise when matched.
    3. Creates a `workout_sessions` row with `status = 'completed'`, `started_at` and `completed_at`
       both set to import time (see `design.md` for the rationale — the JSON has no per-set
       timestamps).
    4. Creates `workout_session_exercises` rows (one per exercise, in JSON order) with
       `actual_* = planned_*` (see `design.md` for the exact mapping and why weight is always null).
    5. Creates `workout_session_sets` rows (one row per planned set) so personal records can be
       recalculated from real set data, exactly as if the user had logged each set live.
    6. Recalculates personal records per exercise by invoking the existing
       `recalculate_pr_for_exercise` Postgres function (the same function the live "autosave" flow
       relies on — see `design.md` for why this is an explicit call, not an automatic trigger).
  - New route `POST /api/workout-sessions/import` mirroring the auth/error-handling conventions of
    `POST /api/workout-plans/import`.
  - New minimal UI entry point on `/workout-sessions` (`ImportSessionButtonM3`, file-upload button +
    link to instructions), mirroring `ImportPlanButtonM3`.
  - New Polish documentation section on `/import-instruction` explaining the session-import JSON
    shape and how it differs from the plan-import shape (mainly: it becomes a completed session
    immediately, not a reusable template).
- Small DB fix (userrequested, bundled into this change because it was needed to accept Anita's real
  JSON): extend the `exercise_part` Postgres enum with `'Cardio'`, `'Shoulders'`, `'Full Body'` (her
  workout used muscle-group labels beyond the existing `Legs, Core, Back, Arms, Chest, Glutes`).
  Update `EXERCISE_PART_VALUES`, generated DB types, and the UI label maps that render `exercise_part`
  values so the new values render properly instead of falling through to "unknown".

## Impact
- **Affected specs**: `workout-sessions` (new capability: session import).
- **Affected code**:
  - `supabase/migrations/` — 1 new migration (enum extension only; no other schema changes needed,
    `workout_sessions` / `workout_session_exercises` / `workout_session_sets` already support
    everything required).
  - `src/lib/validation/workout-sessions.ts` — new schema.
  - `src/services/workout-sessions.ts` — new service function + helpers.
  - `src/app/api/workout-sessions/import/route.ts` — new route.
  - `src/components/workout-sessions/ImportSessionButtonM3.tsx` — new component.
  - `src/app/(app)/workout-sessions/page.tsx` — wire up the new button.
  - `src/app/(app)/import-instruction/page.tsx` — new documentation section.
  - `src/lib/constants.ts`, `src/db/database.types.ts` — enum extension.
  - i18n label maps for `exercise_part` (`en.ts`, `pl.ts`, `ExerciseFormM3.tsx`,
    `ExerciseSelectorM3.tsx`, `WorkoutPlanExerciseItemM3.tsx`, `WorkoutPlanMetadataFieldsM3.tsx`).
- **Non-goals / out of scope**: editing an imported session's `started_at`/`completed_at` after the
  fact, importing per-set weight/actual values (JSON has no such fields today), applying the plan
  importer's "scope" (superset/circuit) grouping semantics to sessions, running `supabase db push`
  or otherwise touching a live database (no DB credentials available in this environment).
