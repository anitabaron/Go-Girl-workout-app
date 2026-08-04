# Design: Natural Language → Completed Workout Session

## (a) Intent detection

In `aiTrainerChatService`, before the general OpenAI chat call, check whether the user message
signals a **past-workout log intent**. Heuristic (no ML needed for MVP):

```
const LOG_SIGNALS = [
  "zrobiłam", "zrobiłem", "trenowałam", "trenowałem",
  "skończyłam", "skończyłem", "byłam na", "byłem na",
  "dzisiaj", "dziś", "wczoraj", "w poniedziałek", ...,
  "3x10", "3 serie", "serii", "powtórzeń",
];
```

If ≥ 2 signals are present AND the message is not asking a question (no `?` at end, no "jak",
"czy", "co", "dlaczego") → treat as log intent, route to `extractWorkoutFromText`.

If the heuristic is ambiguous (1 signal), the AI responds normally but the `buildSuggestedActions`
function appends a `LOG_WORKOUT_SESSION` quick-action button with label "Zapisz jako trening".

## (b) Extraction via structured OpenAI output

Call OpenAI with `response_format: { type: "json_schema", json_schema: ... }` (structured outputs,
no function-calling needed). The schema mirrors `workoutSessionImportSchema`:

```jsonc
{
  "name": "workout_session_import",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "performed_at": { "type": ["string", "null"] },  // ISO date, e.g. "2026-07-31"
      "exercises": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "exercise_title": { "type": "string" },
            "exercise_part": { "type": ["string", "null"] },  // enum value or null
            "section_type": { "type": "string" },             // "Warm-up" | "Main Workout" | "Cool-down"
            "planned_sets": { "type": ["integer", "null"] },
            "planned_reps": { "type": ["integer", "null"] },
            "planned_duration_seconds": { "type": ["integer", "null"] },
            "exercise_is_unilateral": { "type": ["boolean", "null"] }
          },
          "required": ["exercise_title", "section_type"]
        }
      }
    },
    "required": ["name", "exercises"]
  }
}
```

The system prompt for this extraction call (separate from the general trainer prompt):

> Jesteś asystentem wyodrębniającym dane treningowe z tekstu. Użytkownik opisuje trening który właśnie
> wykonał. Wyodrębnij listę ćwiczeń z liczbą serii i powtórzeń (lub czasem). Jeśli brakuje informacji,
> zostaw null. Nazwy ćwiczeń przepisuj wiernie z tekstu użytkownika (nie tłumacz, nie normalizuj).
> Data: jeśli użytkownik mówi "dzisiaj" użyj [TODAY], "wczoraj" użyj [YESTERDAY], inne dni → null.

After extraction, resolve `exercise_title` against the user's library via `findByNormalizedTitle`
(already exists in `src/repositories/exercises.ts`) for each exercise — convert matched ones to
`match_by_name`, leave unmatched as `exercise_title` (snapshot). This is the same resolution
`importWorkoutSessionService` does internally; we run it here to generate the human-readable
summary.

## (c) Human-readable confirmation summary

Before calling the import endpoint, the AI Trainer response includes a text message:

> Rozumiem, że zrobiłaś:
> • Air Bike — 1 seria, 4 min (rozgrzewka)
> • Band Overhead Press — 3 × 10 (barki) ✓ znane
> • Romanian Deadlift — 4 × 6 ✓ znane ćwiczenie z biblioteki
> • Dips — 3 × 8 (nowe ćwiczenie — zostanie dodane)
> …
> Data: 31 lipca 2026
>
> Czy zapisać jako ukończony trening?

"✓ znane" = matched against library. "nowe ćwiczenie" = will be a snapshot.

The `LOG_WORKOUT_SESSION` action in the `actions` array carries the full resolved import payload
as its `payload` field (so `executeAITrainerActionService` can call `importWorkoutSessionService`
directly without re-parsing the user message).

## (d) performed_at date handling

Simple keyword extraction before the OpenAI call:

- "dzisiaj" / "dziś" → today's ISO date
- "wczoraj" → yesterday's ISO date
- "w poniedziałek" / "w wtorek" / … → most recent past occurrence of that weekday
- explicit date mention ("31 lipca", "31.07") → parsed manually or left to the LLM in the schema

Passed as `performed_at` in the import payload → `importWorkoutSessionService` uses it for both
`started_at` and `completed_at` (existing service currently hardcodes `now()`; this adds an optional
override).

## (e) Action execution

New branch in `executeAITrainerActionService`:

```ts
if (parsed.type === "LOG_WORKOUT_SESSION") {
  const session = await importWorkoutSessionService(userId, parsed.payload);
  return { type: "LOG_WORKOUT_SESSION", session_id: session.id, session_url: `/workout-sessions/${session.id}` };
}
```

The UI shows a success toast with a link to the new session. No redirect (user may still be in the
middle of a chat conversation with the trainer).

## (f) Rate limiting

The extraction OpenAI call counts against the existing AI usage daily limit
(`20260309124500_ai_usage_daily_20_limit.sql`). No extra limit needed; the extraction call is one
additional message in the same flow, not a separate quota.
