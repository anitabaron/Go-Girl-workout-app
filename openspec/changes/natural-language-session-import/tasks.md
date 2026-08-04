# Tasks: Natural Language → Completed Workout Session

## 1. Extend import service with `performed_at` override
- [ ] `src/services/workout-sessions.ts` — `importWorkoutSessionService` accepts optional
      `performed_at?: string` (ISO date); if present, use as `started_at` and `completed_at`
      instead of `now()`.
- [ ] `src/lib/validation/workout-sessions.ts` — add `performed_at` optional field to
      `workoutSessionImportSchema`.
- [ ] `src/app/api/workout-sessions/import/route.ts` — pass `performed_at` through.
- [ ] Unit test: `importWorkoutSessionService` with `performed_at` override produces correct timestamps.

## 2. New action type: LOG_WORKOUT_SESSION
- [ ] Add `LOG_WORKOUT_SESSION` to the action type union (wherever existing action types are defined —
      grep `APPLY_LIGHT_VERSION`).
- [ ] Add `LOG_WORKOUT_SESSION` payload schema to `aiTrainerActionExecuteSchema`.
- [ ] i18n pl/en: confirmation button label, success toast copy, error copy.

## 3. Intent detection helper
- [ ] `src/services/ai-trainer.ts` — `detectWorkoutLogIntent(message: string): boolean` using the
      keyword heuristic from `design.md` section (a).
- [ ] `src/lib/workout-sessions/date-hint.ts` — `extractPerformedAt(message: string): string | null`
      (keyword → ISO date, see design.md section (d)).
- [ ] Unit tests for both helpers covering: "zrobiłam dziś", "zrobiłem wczoraj", "3x10 w środę",
      general question (should NOT trigger), missing keywords (should NOT trigger).

## 4. Structured extraction from free text
- [ ] `src/services/ai-trainer.ts` — `extractWorkoutFromText(userId, message, performedAt)`:
  - [ ] Fetch user's exercise library via `findAllTitles` (already exists in
        `src/repositories/exercises.ts`) and inject as context into system prompt.
  - [ ] Call OpenAI with `response_format: json_schema` using the schema from `design.md` section (b).
  - [ ] Resolve each extracted `exercise_title` against library using `findByNormalizedTitle`;
        convert matched → `match_by_name`, unmatched → keep as `exercise_title` (snapshot).
  - [ ] Return both the resolved `WorkoutSessionImportPayload` and a human-readable summary string.
- [ ] Unit/integration test: given a sample Polish description, extraction returns correct exercise
      count and matches known library exercises.

## 5. Wire intent + extraction into aiTrainerChatService
- [ ] In `aiTrainerChatService`, before the general chat call: run `detectWorkoutLogIntent`.
  - [ ] If true: call `extractWorkoutFromText`, build `LOG_WORKOUT_SESSION` suggested action with
        full payload, set AI text response to the confirmation summary from `design.md` section (c).
  - [ ] If ambiguous (1 signal): run general chat call normally, but append `LOG_WORKOUT_SESSION`
        quick-action to `buildSuggestedActions` output.
  - [ ] If false: existing flow unchanged.

## 6. Execute action in executeAITrainerActionService
- [ ] New branch `parsed.type === "LOG_WORKOUT_SESSION"`:
  - [ ] Call `importWorkoutSessionService(userId, parsed.payload)`.
  - [ ] Return `{ type: "LOG_WORKOUT_SESSION", session_id, session_url }`.
- [ ] UI side: handle `LOG_WORKOUT_SESSION` result type in the AI Trainer chat component — show
      success toast with link "Przejdź do sesji".

## 7. Verification
- [ ] `pnpm tsc --noEmit` — clean.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm test` — new unit tests pass; no regressions in existing AI trainer tests.
- [ ] Manual smoke test: type "zrobiłam dziś Romanian Deadlift 4x6, hip thrust 3x10, deski 3x45s"
      in the AI trainer chat → confirm action → session appears in `/workout-sessions`.
