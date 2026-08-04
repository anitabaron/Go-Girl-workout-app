# Natural Language → Completed Workout Session (via AI Trainer chat)

## Why

Anita trains from memory. After finishing, she wants to write one or two casual sentences
("zrobiłam dziś przysiad bułgarski 3x10 z gumą, wspomagane podciąganie, hip thrust i trochę core")
and have the app turn that into a proper logged session — without touching any form, clicking through
exercises, or preparing a JSON file first. She will review the result and fix anything wrong via the
existing session-edit UI.

The previous change (`import-workout-session`) built the backend: `POST /api/workout-sessions/import`
accepts a structured JSON and writes a completed session. This change adds the **natural-language
front-door**: the AI Trainer chat understands "I just did X" messages and calls the import endpoint
on the user's behalf.

## What Changes

- **Detect** workout-log intent in `aiTrainerChatService` (user describing a past workout).
- **Extract** a structured exercise list from the free-text via an OpenAI call with a constrained
  JSON schema output, matching exercise names against the user's library
  (`GET /api/exercises/titles`) where possible (fuzzy / case-insensitive), falling back to snapshot
  for unknown names.
- **Propose** the parsed session back to the user as a readable summary ("Oto co rozumiem…") with a
  new suggested action `LOG_WORKOUT_SESSION` (requires_confirmation: true).
- **Execute** the action via `executeAITrainerActionService` → calls `importWorkoutSessionService`
  internally → session lands in `/workout-sessions` as `status = 'completed'`.
- Optionally accept an optional `performed_at` date hint in the user message ("zrobiłam wczoraj" /
  "w czwartek") and pass it as `started_at` / `completed_at` to the import service (simple keyword
  extraction, no full NLP date parser needed for MVP).

## Impact

- **Affected code**:
  - `src/services/ai-trainer.ts` — new intent detection + extraction function + new action handler
    branch in `executeAITrainerActionService`.
  - `src/lib/validation/workout-sessions.ts` — optionally extend `workoutSessionImportSchema` with
    `performed_at?: string (ISO date)`.
  - `src/services/workout-sessions.ts` — `importWorkoutSessionService` accepts optional
    `performed_at` override for `started_at` / `completed_at`.
  - `src/app/api/workout-sessions/import/route.ts` — pass `performed_at` through if present.
  - `src/types/workout-session-assistant.ts` (or equivalent) — new `LOG_WORKOUT_SESSION` action type.
  - i18n pl/en — confirmation dialog copy for the new action.
- **No DB schema changes** required (uses existing `workout_sessions` / `workout_session_exercises` /
  `workout_session_sets` tables via the already-built import service).
- **Non-goals / out of scope**:
  - Voice / speech-to-text input (text chat only for MVP).
  - Per-set weight parsing from free text (weight is always null on import; user edits via session UI).
  - Multi-turn clarification loop (MVP: one extraction pass; if unsure, the AI asks one clarifying
    question before proposing the summary, then user confirms or cancels).
  - Editing the extracted session before confirming (user confirms the summary, then edits via
    existing session-edit UI if needed).
