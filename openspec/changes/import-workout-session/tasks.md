# Tasks: Import Workout Session

## 1. DB: exercise_part enum extension
- [x] Add migration `supabase/migrations/20260803120000_add_cardio_shoulders_fullbody_to_exercise_part.sql`
      adding `'Cardio'`, `'Shoulders'`, `'Full Body'` to `exercise_part` (guarded `IF NOT EXISTS`,
      mirroring `20260208130000_add_glutes_to_exercise_part.sql`).
- [x] Update `EXERCISE_PART_VALUES` in `src/lib/constants.ts`.
- [x] Update generated `src/db/database.types.ts` (`Enums.exercise_part`, `Constants.public.Enums.exercise_part`).
- [x] Update i18n label keys (`en.ts`, `pl.ts`) for `exerciseLabels.part.*`, `workoutPlanMetadata.partOption.*`,
      `workoutPlanExerciseItem.partOption.*`, `exerciseSelector.partOption.*`, `exerciseForm.partOption.*`
      (including the space-vs-no-space key needed by `WorkoutPlanMetadataFieldsM3`'s dynamic
      `partOption.${part.toLowerCase()}` lookup for "Full Body").
- [x] Update non-exhaustive if-chains in `ExerciseFormM3.tsx`, `ExerciseSelectorM3.tsx`,
      `WorkoutPlanExerciseItemM3.tsx` to branch on the 3 new values.

## 2. Validation
- [x] `src/lib/validation/workout-sessions.ts`: add `workoutSessionImportExerciseSchema` (re-exports/
      wraps `workoutPlanExerciseImportSchema`) and `workoutSessionImportSchema` (name, description,
      part, exercises[]).
- [x] Unit tests: `src/__tests__/lib/validation/workout-sessions-import.test.ts`.

## 3. Service
- [x] `src/services/workout-sessions.ts`: add `importWorkoutSessionService(userId, payload)`:
  - [x] Parse + validate payload.
  - [x] Resolve `match_by_name` → `exercise_id` or snapshot (mirrors
        `resolveOneMatchByName`/`applySnapshotFromMatchByName` from `workout-plans.ts`).
  - [x] Enrich planned_* from matched library exercises; convert missing `exercise_id` references to
        snapshots (mirrors `enrichExerciseFromLibrary`/`convertMissingExerciseToSnapshot`).
  - [x] Validate every exercise ends up with >=1 of planned_reps/planned_duration_seconds; throw
        `BAD_REQUEST` naming the exercise otherwise.
  - [x] Insert `workout_sessions` row (`status: 'completed'`, `started_at`/`completed_at` = now,
        `workout_plan_id: null`, `plan_name_at_time: parsed.name`).
  - [x] Insert `workout_session_exercises` rows (actual_* = planned_*, exercise_order = index+1).
  - [x] Insert `workout_session_sets` rows (1 per planned_sets, reps/duration from planned, weight null).
  - [x] Call `recalculate_pr_for_exercise` RPC once per unique non-null `exercise_id`.
  - [x] Return the full `SessionDetailDTO` (reusing `getWorkoutSessionService`/`mapToDetailDTO`).
- [x] Repository helper(s) in `src/repositories/workout-sessions.ts` for the completed-session insert
      and batch set insert (extend/parallel to `insertWorkoutSession`/`insertWorkoutSessionExercises`).

## 4. API route
- [x] `src/app/api/workout-sessions/import/route.ts`: `POST`, auth via `getUserIdFromSession`, calls
      `importWorkoutSessionService`, `handleRouteError` on failure, `201` on success (mirrors
      `POST /api/workout-plans/import`).

## 5. UI
- [x] `src/components/workout-sessions/ImportSessionButtonM3.tsx`: file-upload button (mirrors
      `ImportPlanButtonM3`), posts to `/api/workout-sessions/import`, toasts, redirects to
      `/workout-sessions/{id}`.
- [x] Wire it into `src/app/(app)/workout-sessions/page.tsx` header actions.
- [x] `src/app/(app)/import-instruction/page.tsx`: new "Step 5" section documenting the session-import
      JSON shape and its differences from plan import (completed immediately, no scope/superset
      grouping, started_at/completed_at = import time, weight always null).
- [x] i18n keys for the new button + instruction copy.

## 6. Verification
- [x] `pnpm test` (Vitest) — new + existing tests pass.
- [x] `pnpm type-check` (`tsc --noEmit`) — clean, including the enum-driven if-chains.
- [x] `pnpm lint` on touched files — clean.
- [x] Do not run `supabase db push`, `git commit`, or `git push`.
