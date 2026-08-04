## ADDED Requirements

### Requirement: Import a completed workout session from JSON
The system SHALL allow an authenticated user to submit a JSON payload describing a workout
(`name`, optional `description`, optional `part`, and an `exercises` array using the same
exercise-identification union as plan import: `exercise_id`, `match_by_name`, or `exercise_title`
snapshot) and have it created as an already-completed `workout_sessions` record, visible immediately
in the user's session list, without creating a `workout_plans` record.

#### Scenario: Importing a valid workout JSON creates a completed session
- **GIVEN** an authenticated user submits `POST /api/workout-sessions/import` with a JSON body
  containing `name`, `part`, and a non-empty `exercises` array where each exercise resolves to a
  valid exercise (via `exercise_id`, `match_by_name`, or a new `exercise_title` snapshot)
- **WHEN** the import is processed
- **THEN** a new `workout_sessions` row is created with `status = 'completed'`, `started_at` and
  `completed_at` set to the import timestamp, `workout_plan_id = null`, and
  `plan_name_at_time = name`
- **AND** the response is `201 Created` with the full session detail (exercises + sets included)
- **AND** the new session appears in `GET /api/workout-sessions` / the `/workout-sessions` page
  without further action from the user

#### Scenario: Exercise resolution mirrors the plan importer
- **GIVEN** an exercise line specifies `match_by_name: "Romanian Deadlift"`
- **WHEN** an exercise with a matching normalized title exists in the user's library
- **THEN** it is linked via `exercise_id` (its title/type/part are copied into the session
  exercise's snapshot columns) exactly as the plan importer would
- **GIVEN** instead no matching exercise is found in the library
- **WHEN** the import is processed
- **THEN** the exercise is created as a snapshot-only session exercise (`exercise_id = null`,
  `exercise_title_at_time` set from `match_by_name`) — no new row is added to the shared `exercises`
  library table, matching the plan importer's "snapshot fallback" behavior

#### Scenario: Planned values become actual/performed values
- **GIVEN** an exercise line has `planned_sets: 3`, `planned_reps: 12` and no weight field (the
  import JSON never carries weight)
- **WHEN** the session is created
- **THEN** the corresponding `workout_session_exercises` row has `actual_sets = 3`
- **AND** exactly 3 `workout_session_sets` rows are created for that exercise, each with `reps = 12`,
  `duration_seconds = null`, and `weight_kg = null`

#### Scenario: Missing reps/duration is rejected, not guessed
- **GIVEN** an exercise line provides neither `planned_reps` nor `planned_duration_seconds`, and it
  does not resolve to a library exercise that supplies one of those values
- **WHEN** the import is processed
- **THEN** the request is rejected with a `400 Bad Request` naming the offending exercise (title
  and/or position in the array); no partial session is created

#### Scenario: Personal records are recalculated after import
- **GIVEN** an imported exercise resolves to a library `exercise_id` and its imported sets contain a
  higher total rep count (or longer single-set duration) than the user's current PR for that
  exercise/metric
- **WHEN** the import completes
- **THEN** the user's `personal_records` row for that exercise/metric is updated to reflect the new
  best value, with `achieved_in_session_id` pointing at the newly imported session
- **GIVEN** the imported sets are not better than the existing PR
- **WHEN** the import completes
- **THEN** the existing PR is left unchanged (no regression)

#### Scenario: Snapshot-only exercises never generate PRs
- **GIVEN** an exercise line has no `exercise_id` and no `match_by_name` match (snapshot-only)
- **WHEN** the import completes
- **THEN** no personal-record recalculation is attempted for that exercise (there is no library
  `exercise_id` to key a PR on)
