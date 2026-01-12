# REST API Plan

## 1. Resources

- `Exercise` → `exercises`
- `WorkoutPlan` → `workout_plans`
- `WorkoutPlanExercise` (ordered items within plan) → `workout_plan_exercises`
- `WorkoutSession` → `workout_sessions`
- `WorkoutSessionExercise` (per-session exercise snapshot) → `workout_session_exercises`
- `WorkoutSessionSet` (per-set logs) → `workout_session_sets`
- `PersonalRecord` → `personal_records`
- `AIUsage` (monthly counter) → `ai_usage`
- `AIRequest` (audit log) → `ai_requests`

## 2. Endpoints

Notes:

- Base path: `/api`.
- Auth: Supabase Auth; all endpoints require authenticated user. RLS enforces user isolation.
- Responses use `{ "data": ..., "error": { code, message, details? } }`.
- Pagination: cursor or limit/offset; default `limit=20`, max `100`.
- Sorting: `sort` and `order` where relevant (whitelisted fields).
- Filtering: only on indexed columns (e.g., `part`, `type`, `status`, `plan_id`, `created_at` ranges).

### 2.1 Exercises

- `POST /api/exercises`

  - Create exercise; validates reps XOR duration, rest_in_between OR rest_after_series, `series > 0`, unique normalized title.
  - Body: `{ title, type, part, level?, details?, reps?, duration_seconds?, series, rest_in_between_seconds?, rest_after_series_seconds? }`
  - Success: `201` with created exercise.
  - Errors: `400` validation (metric/rest rules), `409` duplicate title, `401/403` auth, `500`.

- `GET /api/exercises`

  - List current user's exercises with filters.
  - Query: `search?`, `part?`, `type?`, `sort=created_at|title|part|type`, `order=asc|desc`, `limit`, `cursor`.
  - Success: `200` `{ items, nextCursor? }`.
  - Errors: `401/403`, `400` bad params.

- `GET /api/exercises/{id}`

  - Fetch one exercise.
  - Success: `200`.
  - Errors: `404` if not owned, `401/403`.

- `PATCH /api/exercises/{id}`

  - Update fields with same validation/uniqueness.
  - Body: partial same as create.
  - Success: `200`.
  - Errors: `400`, `409` duplicate title, `404`, `401/403`.

- `DELETE /api/exercises/{id}`
  - Delete if no FK references (sessions/PR/plan items). FK restrict returns error.
  - Success: `204`.
  - Errors: `409` if referenced, `404`, `401/403`.

### 2.2 Workout Plans

- `POST /api/workout-plans`

  - Create plan with ordered exercises.
  - Body: `{ name, description?, part?, exercises: [{ exercise_id, section_type, section_position, planned_sets?, planned_reps?, planned_duration_seconds?, planned_rest_seconds? }] }`
  - Validation: at least one exercise; section*position > 0 and unique per section; planned*\* positive if present; exercise_id must belong to user.
  - Success: `201` with plan + items.
  - Errors: `400` validation/empty plan, `409` duplicates in positions, `401/403`.

- `GET /api/workout-plans`

  - List plans.
  - Query: `part?`, `sort=created_at|name`, `order`, `limit`, `cursor`.
  - Success: `200` list with counts.

- `GET /api/workout-plans/{id}`

  - Plan detail with exercises (ordered by section_type, section_position).
  - Success: `200`.
  - Errors: `404`, `401/403`.

- `PATCH /api/workout-plans/{id}`

  - Update metadata and full exercise list (replace strategy).
  - Body same as create; validation same; affects future sessions only.
  - Success: `200`.
  - Errors: `400`, `409`, `404`, `401/403`.

- `DELETE /api/workout-plans/{id}`
  - Remove plan; sessions remain (plan_name snapshot preserved).
  - Success: `204`.
  - Errors: `404`, `401/403`.

### 2.3 Workout Sessions (start/resume/history)

- `POST /api/workout-sessions`

  - Start new session from plan or resume existing in_progress.
  - Body: `{ workout_plan_id }` optional (required for MVP; ad-hoc not in scope).
  - Logic: if user has in_progress session, return it (status 200) and do not create new; else create new session with snapshots of plan and plan exercises into session exercises.
  - Success: `201` new session or `200` resumed.
  - Errors: `404` plan not found/owned, `409` if conflicting state, `401/403`.

- `GET /api/workout-sessions`

  - List sessions (history).
  - Query: `status?=in_progress|completed`, `plan_id?`, `from?`/`to?` date, `sort=started_at|completed_at|status`, `order`, `limit`, `cursor`.
  - Success: `200` summary items (id, plan_name_at_time, status, started_at, completed_at).

- `GET /api/workout-sessions/{id}`

  - Session detail with exercises and sets; includes planned vs actual.
  - Success: `200`.
  - Errors: `404`, `401/403`.

- `PATCH /api/workout-sessions/{id}/status`
  - Update status to `completed` or `in_progress` (for pause/resume); sets `completed_at` when completing.
  - Body: `{ status }`.
  - Success: `200`.
  - Errors: `400` invalid transition, `404`, `401/403`.

### 2.4 Session Exercise Autosave (next/previous/skip)

- `PATCH /api/workout-sessions/{id}/exercises/{position}`
  - Upsert state for exercise at given position; supports autosave on next/pause/skip and previous edits.
  - Body:
    - `actual_sets?`, `actual_reps?`, `actual_duration_seconds?`, `actual_rest_seconds?`, `is_skipped?`
    - `planned_sets?`, `planned_reps?`, `planned_duration_seconds?`, `planned_rest_seconds?` (client may send to keep parity with plan)
    - `sets?: [{ set_number, reps?, duration_seconds?, weight_kg? }]` (replaces existing sets)
    - `advance_cursor_to_next?: boolean` (client indicates “next” intent)
  - Validation:
    - position > 0; exercise must exist in session.
    - Each set must have at least one metric (reps/duration/weight) and values >= 0.
    - If skip: allowed with empty sets; mark `is_skipped=true`.
  - Side effects:
    - Replaces existing sets for that exercise.
    - Recalculates PR for the exercise (uses DB function).
    - Updates session `current_position` and `last_action_at`; if `advance_cursor_to_next` moves forward else stays.
  - Success: `200` returns updated exercise with sets and new cursor.
  - Errors: `400` validation, `404` session/exercise not found, `409` session not in_progress, `401/403`.

### 2.5 Personal Records

- `GET /api/personal-records`

  - List PRs.
  - Query: `exercise_id?`, `metric_type?`, `sort=achieved_at|value`, `order`, `limit`, `cursor`.
  - Success: `200` items with exercise metadata.
  - Errors: `401/403`.

- `GET /api/personal-records/{exercise_id}`
  - PRs for specific exercise (all metric types).
  - Success: `200`.
  - Errors: `404` if exercise not owned, `401/403`.

### 2.6 AI: Generate/Optimize Plans

- Shared rules:

  - Enforce 5 calls/month per user (`ai_usage`), retry on system_error does not decrement.
  - Block if user has no exercises.
  - Validate returned JSON: all `exercise_id` belong to user; required planned\_\* present; reject otherwise.
  - Log request/response in `ai_requests` (no PII).

- `POST /api/ai/generate-plan`

  - Body: `{ goal, level, duration_minutes, parts:[], equipment?:string[] }`
  - Success: `200` with proposed plan `{ name, description?, part?, exercises:[{ exercise_id, section_type, section_position, planned_sets?, planned_reps?, planned_duration_seconds?, planned_rest_seconds? }] }`
  - Errors: `400` validation/limit exceeded, `401/403`, `429` rate/limit, `500` system_error (does not decrement usage).

- `POST /api/ai/optimize-plan`
  - Body: `{ workout_plan_id, goal?, level?, duration_minutes?, parts?, equipment? }`
  - Validates plan ownership; same limit/validation as generate.
  - Success/Errors same as above.

### 2.7 AI Usage

- `GET /api/ai/usage`
  - Returns `{ remaining, used, month, reset_at }`.
  - Success: `200`.

### 2.8 Health/Utility (optional)

- `GET /api/health` – simple 200 for monitoring.

## 3. Authentication and Authorization

- Supabase Auth (e.g., magic link) for identity.
- RLS active on all domain tables; queries filtered by `auth.uid()`.
- API must never trust client-provided user IDs; user inferred from session token.
- Use service role only for server-to-DB operations where needed; never exposed to client.
- For AI endpoints, server-side secret OpenRouter key; client cannot call AI directly.

## 4. Validation and Business Logic

- Exercise validation: reps XOR duration required; rest_in_between OR rest_after_series required; `series > 0`; rest values ≥ 0; title normalized uniqueness per user; block delete on FK references.
- Plan validation: at least one exercise; section*position > 0 unique per (plan, section_type); planned*\* positive when provided; exercise_ids must belong to user.
- Session rules: single `in_progress` per user; status enum (`in_progress`, `completed`); `current_position ≥ 0`; snapshot fields are immutable after creation.
- Session exercise rules: position > 0; planned\_/actual non-negative; skip allowed; updates recalc PR.
- Set rules: `set_number > 0`; at least one metric present (reps/duration/weight); all metrics ≥ 0; replace-on-save semantics.
- PR logic: computed from session sets via DB function; stored in `personal_records`; recalculated on every save/edit; per metric type.
- AI limits: `usage_count ≤ 5` per month; increment only on non-system-error completion; block when no exercises.
- Deletion rules: exercises cannot be deleted if referenced (FK restrict); plans deletion does not remove sessions (snapshots persist).
- Error handling: return specific codes (`400` validation, `401/403` auth, `404` not found/foreign ownership, `409` conflict/duplicate/in_progress guard, `429` rate/limit, `500` system).

## 5. Security and Rate Limiting

- RLS as primary data isolation.
- Endpoint-level checks: ensure resource ownership before operations (mirrors RLS).
- Rate limit (recommended): per-user/IP for AI endpoints and write-heavy endpoints (`POST/PUT/PATCH/DELETE`), e.g., 60 req/min user-level; tighter (e.g., 10/min) for AI.
- Input sanitization: enforce schema validation; reject unknown fields.
- Secrets: OpenRouter key server-only; no PII in AI payloads/logs.
- Auditing: log AI calls (`ai_requests`), include error codes and system_error flag to avoid limit decrement on failures.

## 6. Pagination, Filtering, Sorting Defaults

- Pagination: `limit` default 20, max 100; `cursor` (opaque) preferred; offset allowed for small lists.
- Sorting:
  - Exercises: by `created_at` (default desc), `title`, `part`, `type`.
  - Plans: `created_at` desc default; `name`.
  - Sessions: `started_at` desc default; `status`.
  - PRs: `achieved_at` desc default; `value`.
- Filtering (indexed): exercises by `part`, `type`, search by normalized title; plans by `part`; sessions by `status`, date range, plan_id; PR by `exercise_id`, `metric_type`.

## 7. Response Shapes (examples)

- Exercise item: `{ id, title, type, part, level?, details?, reps?, duration_seconds?, series, rest_in_between_seconds?, rest_after_series_seconds?, created_at, updated_at }`
- Plan item: `{ id, name, description?, part?, exercises: [{ id, exercise_id, section_type, section_position, planned_sets?, planned_reps?, planned_duration_seconds?, planned_rest_seconds? }] , created_at, updated_at }`
- Session summary: `{ id, workout_plan_id?, plan_name_at_time?, status, started_at, completed_at?, current_position }`
- Session detail: `{ ...summary, exercises: [{ id, position, exercise_id, exercise_title_at_time, exercise_type_at_time, exercise_part_at_time, planned_*, actual_*, is_skipped, sets: [{ set_number, reps?, duration_seconds?, weight_kg? }] }] }`
- Personal record item: `{ id, exercise_id, metric_type, value, achieved_at, achieved_in_session_id?, achieved_in_set_number?, created_at, updated_at }`
- AI usage: `{ month_year, usage_count, remaining }`

## 8. Error Codes (common)

- `400` Validation failed (details included).
- `401/403` Unauthenticated/Forbidden (RLS or auth failure).
- `404` Not found or not owned.
- `409` Conflict: duplicate exercise title; session already in_progress; plan empty violation; position uniqueness; FK restrict on delete.
- `429` Rate/limit exceeded (esp. AI).
- `500` Internal / system_error (AI retry does not decrement usage).

## 9. Implementation Notes (Next.js + Supabase)

- Use Next.js Route Handlers under `src/app/api/...` with server actions; Supabase server client with user session validation per request.
- Enforce schema validation (e.g., Zod) matching DB constraints before DB calls.
- On session-exercise save, wrap in transaction: upsert exercise row, replace sets, call `recalculate_pr_for_exercise`, update session cursor/timestamps.
- For AI endpoints: check `ai_usage`, ensure user has exercises, call OpenRouter server-side, validate response, log to `ai_requests`, increment `ai_usage` unless system_error.
- Respect snapshots: do not mutate session snapshots after creation; plan deletion leaves sessions intact.
