# Spec: AI Trainer — Natural Language Workout Logging

## ADDED Requirements

### Requirement: Log a completed workout from a free-text description

The AI Trainer chat understands when the user is describing a workout they just finished and converts
the description into a completed workout session, reusing the existing JSON import backend.

#### Scenario: User describes a workout they finished today

- **Given** the user is in the AI Trainer chat
- **And** they send a message containing workout-log signals (past-tense verb + exercise/set info),
  e.g. "zrobiłam dziś przysiad bułgarski 3x10 z gumą, wspomagane podciąganie 3x10, hip thrust 3x10"
- **When** the AI Trainer processes the message
- **Then** it extracts the exercise list via a structured OpenAI call
- **And** it matches known exercise names against the user's exercise library (case-insensitive)
- **And** it responds with a human-readable summary of what it understood
- **And** it surfaces a `LOG_WORKOUT_SESSION` action button ("Zapisz jako trening")
  with `requires_confirmation: true`

#### Scenario: User confirms the proposed session

- **Given** the AI Trainer has proposed a `LOG_WORKOUT_SESSION` action
- **When** the user confirms the action
- **Then** `executeAITrainerActionService` calls `importWorkoutSessionService` with the resolved payload
- **And** a new `workout_sessions` row is created with `status = 'completed'`
- **And** `workout_session_exercises` and `workout_session_sets` rows are created (actual = planned)
- **And** personal records are recalculated for matched library exercises
- **And** the chat response includes a link to the new session (`/workout-sessions/{id}`)

#### Scenario: User mentions a past date ("wczoraj", "w czwartek")

- **Given** the user message contains a date hint
- **When** the extraction runs
- **Then** `performed_at` is set to the resolved date (not today)
- **And** the session's `started_at` and `completed_at` reflect that date

#### Scenario: User message is a question, not a workout description

- **Given** the user sends "jak poprawić technikę przysiadu?"
- **When** the AI Trainer processes the message
- **Then** the intent detection returns false
- **And** the message is handled by the existing general chat flow (no extraction, no LOG action)

#### Scenario: Extraction includes unknown exercise names

- **Given** the user mentions an exercise not in their library (e.g. "box jump")
- **When** `findByNormalizedTitle` finds no match
- **Then** the exercise is included in the import payload as `exercise_title` (snapshot)
- **And** the summary marks it as "nowe ćwiczenie — zostanie dodane"
- **And** the import proceeds normally (snapshot exercises are supported by the existing service)

#### Scenario: User cancels the proposed action

- **Given** the AI Trainer has proposed a `LOG_WORKOUT_SESSION` action
- **When** the user does not confirm (ignores or says "nie")
- **Then** no session is created
- **And** the chat continues normally

## MODIFIED Requirements

### Requirement: importWorkoutSessionService supports a custom date

- **Given** `importWorkoutSessionService` is called with a `performed_at` ISO date string
- **Then** `started_at` and `completed_at` are set to that date (not `now()`)
- **And** all other import behaviour is unchanged
