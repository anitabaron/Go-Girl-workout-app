# Przykłady użycia API dla ćwiczeń w sesji treningowej

## 1. POST - Rozpoczęcie sesji treningowej

**Endpoint:** `POST /api/workout-sessions`

**Request Body:**

```json
{
  "workout_plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (200 OK):**

```json
{
  "id": "session-uuid-123",
  "workout_plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "in_progress",
  "plan_name_at_time": "Trening nóg",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": null,
  "current_position": 0,
  "exercises": [
    {
      "id": "exercise-1-uuid",
      "exercise_id": "exercise-base-uuid",
      "exercise_title_at_time": "Przysiady",
      "exercise_type_at_time": "Main Workout",
      "exercise_part_at_time": "Legs",
      "order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_duration_seconds": null,
      "planned_rest_seconds": 60,
      "actual_count_sets": null,
      "actual_sum_reps": null,
      "actual_duration_seconds": null,
      "is_skipped": false,
      "sets": []
    }
  ]
}
```

---

## 2. GET - Pobranie sesji treningowej z ćwiczeniami

**Endpoint:** `GET /api/workout-sessions/{id}`

**Path Parameters:**

- `id`: UUID sesji treningowej

**Example:**

```bash
GET /api/workout-sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response (200 OK):**

```json
{
  "id": "session-uuid-123",
  "workout_plan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "in_progress",
  "plan_name_at_time": "Trening nóg",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": null,
  "current_position": 2,
  "exercises": [
    {
      "id": "exercise-1-uuid",
      "exercise_id": "exercise-base-uuid",
      "exercise_title_at_time": "Przysiady",
      "exercise_type_at_time": "Main Workout",
      "exercise_part_at_time": "Legs",
      "order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_duration_seconds": null,
      "planned_rest_seconds": 60,
      "actual_count_sets": 3,
      "actual_sum_reps": 30,
      "actual_duration_seconds": null,
      "is_skipped": false,
      "sets": [
        {
          "id": "set-1-uuid",
          "set_number": 1,
          "reps": 12,
          "duration_seconds": null,
          "weight_kg": 50.0
        },
        {
          "id": "set-2-uuid",
          "set_number": 2,
          "reps": 10,
          "duration_seconds": null,
          "weight_kg": 50.0
        },
        {
          "id": "set-3-uuid",
          "set_number": 3,
          "reps": 8,
          "duration_seconds": null,
          "weight_kg": 50.0
        }
      ]
    },
    {
      "id": "exercise-2-uuid",
      "exercise_id": "exercise-base-uuid-2",
      "exercise_title_at_time": "Martwy ciąg",
      "exercise_type_at_time": "Main Workout",
      "exercise_part_at_time": "Legs",
      "order": 2,
      "planned_sets": 4,
      "planned_reps": 8,
      "planned_duration_seconds": null,
      "planned_rest_seconds": 90,
      "actual_count_sets": null,
      "actual_sum_reps": null,
      "actual_duration_seconds": null,
      "is_skipped": false,
      "sets": []
    }
  ]
}
```

---

## 3. PATCH - Autosave ćwiczenia w sesji

**Endpoint:** `PATCH /api/workout-sessions/{id}/exercises/{order}`

**Path Parameters:**

- `id`: UUID sesji treningowej
- `order`: Kolejność ćwiczenia w sesji (liczba całkowita > 0)

### ⚠️ Ważne: Różnica między agregatami a wartościami w seriach

**Agregaty na poziomie ćwiczenia** (opcjonalne, można pominąć - zostaną obliczone automatycznie):

- `actual_count_sets` - liczba wykonanych serii (domyślnie: `sets.length`)
- `actual_sum_reps` - suma reps ze wszystkich serii (domyślnie: suma `reps` z każdej serii)
- `actual_duration_seconds` - maksymalny czas z pojedynczej serii (dla PR, domyślnie: max `duration_seconds` z serii)

**Wartości w każdej serii** (wymagane, jeśli podajesz `sets`):

Każda seria w tablicy `sets` reprezentuje faktycznie wykonaną serię z jej rzeczywistymi wartościami:

- `reps` - **faktyczna liczba powtórzeń wykonanych w tej konkretnej serii** (to jest `actual_reps` dla tej serii)
- `duration_seconds` - **faktyczny czas trwania tej konkretnej serii** (to jest `actual_duration_seconds` dla tej serii)
- `weight_kg` - **faktyczny ciężar użyty w tej konkretnej serii** (to jest `actual_weight_kg` dla tej serii)

**Przykład:**

```json
{
  "actual_count_sets": 3, // ← Agregat: liczba serii (można pominąć)
  "actual_sum_reps": 30, // ← Agregat: suma reps (12+10+8 = 30, można pominąć)
  "sets": [
    {
      "set_number": 1,
      "reps": 12, // ← Faktyczna liczba powtórzeń wykonanych w serii 1
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 1
    },
    {
      "set_number": 2,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 2
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 2
    },
    {
      "set_number": 3,
      "reps": 8, // ← Faktyczna liczba powtórzeń wykonanych w serii 3
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 3
    }
  ]
}
```

**Ważne:**

- `reps` w każdej serii to faktyczna wartość wykonana w tej serii (to jest `actual_reps` dla tej konkretnej serii)
- `actual_sum_reps` na poziomie ćwiczenia to suma wszystkich `reps` ze wszystkich serii (agregat)

**Uwaga:** `actual_rest_seconds` nie jest obsługiwane w request body (nie jest potrzebne).

### Przykład 1: Pełny autosave z seriami i przesunięciem kursora

**Request:**

```bash
PATCH /api/workout-sessions/session-uuid-123/exercises/1
```

**Request Body:**

```json
{
  "actual_count_sets": 3,
  "actual_sum_reps": 30,
  "actual_duration_seconds": null,
  "is_skipped": false,
  "sets": [
    {
      "set_number": 1,
      "reps": 12, // ← Faktyczna liczba powtórzeń wykonanych w serii 1 (actual_reps dla serii 1)
      "duration_seconds": null,
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 1
    },
    {
      "set_number": 2,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 2 (actual_reps dla serii 2)
      "duration_seconds": null,
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 2
    },
    {
      "set_number": 3,
      "reps": 8, // ← Faktyczna liczba powtórzeń wykonanych w serii 3 (actual_reps dla serii 3)
      "duration_seconds": null,
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 3
    }
  ],
  "advance_cursor_to_next": true
}
```

**Wyjaśnienie:**

- `actual_count_sets: 3` - liczba wykonanych serii (można pominąć, zostanie obliczona z `sets.length`)
- `actual_sum_reps: 30` - suma reps ze wszystkich serii (12 + 10 + 8 = 30, można pominąć, zostanie obliczona automatycznie)
- `sets` - tablica serii, gdzie każda seria zawiera **faktyczne wartości wykonane w tej serii**:
  - `reps` - **faktyczna liczba powtórzeń wykonanych w tej konkretnej serii** (to jest `actual_reps` dla tej serii)
  - `duration_seconds` - **faktyczny czas trwania tej konkretnej serii** (to jest `actual_duration_seconds` dla tej serii)
  - `weight_kg` - **faktyczny ciężar użyty w tej konkretnej serii** (to jest `actual_weight_kg` dla tej serii)

**Response (200 OK):**

```json
{
  "data": {
    "id": "exercise-1-uuid",
    "exercise_id": "exercise-base-uuid",
    "exercise_title_at_time": "Przysiady",
    "exercise_type_at_time": "Main Workout",
    "exercise_part_at_time": "Legs",
    "order": 1,
    "planned_sets": 4,
    "planned_reps": 10,
    "planned_duration_seconds": null,
    "planned_rest_seconds": 60,
    "actual_count_sets": 3,
    "actual_sum_reps": 30,
    "actual_duration_seconds": null,
    "is_skipped": false,
    "sets": [
      {
        "id": "set-1-uuid",
        "set_number": 1,
        "reps": 12,
        "duration_seconds": null,
        "weight_kg": 50.0
      },
      {
        "id": "set-2-uuid",
        "set_number": 2,
        "reps": 10,
        "duration_seconds": null,
        "weight_kg": 50.0
      },
      {
        "id": "set-3-uuid",
        "set_number": 3,
        "reps": 8,
        "duration_seconds": null,
        "weight_kg": 50.0
      }
    ],
    "cursor": {
      "current_position": 2,
      "last_action_at": "2024-01-15T10:15:00Z"
    }
  }
}
```

### Przykład 2: Zapisanie faktycznych wartości dla każdej serii osobno

**To jest główny sposób zapisywania `actual_reps` dla każdej serii!**

W każdej serii w tablicy `sets` pole `reps` reprezentuje **faktyczną liczbę powtórzeń wykonanych w tej konkretnej serii**. To jest właśnie `actual_reps` dla tej serii.

**Request Body:**

```json
{
  "sets": [
    {
      "set_number": 1,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 1 (actual_reps dla serii 1)
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 1
    },
    {
      "set_number": 2,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 2 (actual_reps dla serii 2)
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 2
    },
    {
      "set_number": 3,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 3 (actual_reps dla serii 3)
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 3
    }
  ]
}
```

**Wyjaśnienie:**

- Każda seria w `sets` zawiera **faktyczne wartości wykonane w tej konkretnej serii**:
  - `reps: 10` w serii 1 = faktycznie wykonano 10 powtórzeń w serii 1 (to jest `actual_reps` dla serii 1)
  - `reps: 10` w serii 2 = faktycznie wykonano 10 powtórzeń w serii 2 (to jest `actual_reps` dla serii 2)
  - `reps: 10` w serii 3 = faktycznie wykonano 10 powtórzeń w serii 3 (to jest `actual_reps` dla serii 3)
- `actual_count_sets` zostanie automatycznie obliczone jako `sets.length` (3)
- `actual_sum_reps` zostanie automatycznie obliczone jako suma `reps` ze wszystkich serii (10+10+10 = 30)
- Można też podać `actual_count_sets` i `actual_sum_reps` ręcznie, jeśli chcemy nadpisać wartości obliczone z serii

### Przykład 2b: Minimalny autosave - tylko serie (agregaty obliczane automatycznie)

**Request Body:**

```json
{
  "sets": [
    {
      "set_number": 1,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 1
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 1
    },
    {
      "set_number": 2,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 2
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 2
    },
    {
      "set_number": 3,
      "reps": 10, // ← Faktyczna liczba powtórzeń wykonanych w serii 3
      "weight_kg": 50.0 // ← Faktyczny ciężar użyty w serii 3
    }
  ]
}
```

**Wyjaśnienie:**

- Każda seria w `sets` zawiera **faktyczne wartości wykonane w tej konkretnej serii**:
  - `reps: 10` w serii 1 = faktycznie wykonano 10 powtórzeń w serii 1
  - `reps: 10` w serii 2 = faktycznie wykonano 10 powtórzeń w serii 2
  - `reps: 10` w serii 3 = faktycznie wykonano 10 powtórzeń w serii 3
- `actual_count_sets` zostanie automatycznie obliczone jako `sets.length` (3)
- `actual_sum_reps` zostanie automatycznie obliczone jako suma `reps` ze wszystkich serii (10+10+10 = 30)
- Można też podać `actual_count_sets` i `actual_sum_reps` ręcznie, jeśli chcemy nadpisać wartości obliczone z serii

### Przykład 3: Autosave ćwiczenia z czasem (cardio)

**Request Body:**

```json
{
  "actual_count_sets": 1,
  "actual_duration_seconds": 300,
  "sets": [
    {
      "set_number": 1,
      "duration_seconds": 300,
      "reps": null,
      "weight_kg": null
    }
  ]
}
```

**Wyjaśnienie:**

- `actual_duration_seconds: 300` - maksymalny czas z pojedynczej serii (dla PR)
- W serii: `duration_seconds: 300` - czas trwania tej konkretnej serii
- `actual_sum_reps` nie jest potrzebne dla ćwiczeń cardio (może być null)

### Przykład 4: Pominięcie ćwiczenia

**Request Body:**

```json
{
  "is_skipped": true,
  "advance_cursor_to_next": true
}
```

### Przykład 5: Aktualizacja planned*\* (dla parzystości z planem) + actual*\*

**Request Body:**

```json
{
  "actual_count_sets": 4,
  "actual_sum_reps": 40,
  "planned_sets": 4,
  "planned_reps": 10,
  "planned_rest_seconds": 90,
  "sets": [
    {
      "set_number": 1,
      "reps": 10,
      "weight_kg": 50.0
    },
    {
      "set_number": 2,
      "reps": 10,
      "weight_kg": 50.0
    },
    {
      "set_number": 3,
      "reps": 10,
      "weight_kg": 50.0
    },
    {
      "set_number": 4,
      "reps": 10,
      "weight_kg": 50.0
    }
  ]
}
```

**Wyjaśnienie:**

- `planned_sets: 4` - ile serii było zaplanowanych
- `planned_reps: 10` - ile reps było zaplanowane na serię
- `actual_count_sets: 4` - ile serii faktycznie wykonano (liczba serii w tablicy)
- `actual_sum_reps: 40` - suma reps ze wszystkich serii (10+10+10+10 = 40)
- `planned_rest_seconds: 90` - czas odpoczynku między seriami (z planu)

### Przykład 6: Autosave bez przesunięcia kursora (praca nad tym samym ćwiczeniem)

**Request Body:**

```json
{
  "actual_count_sets": 2,
  "actual_sum_reps": 20,
  "sets": [
    {
      "set_number": 1,
      "reps": 12,
      "weight_kg": 45.0
    },
    {
      "set_number": 2,
      "reps": 8,
      "weight_kg": 45.0
    }
  ],
  "advance_cursor_to_next": false
}
```

---

## Błędy

### 400 Bad Request

```json
{
  "message": "order musi być liczbą całkowitą większą od 0",
  "code": "BAD_REQUEST"
}
```

### 401 Unauthorized

```json
{
  "message": "Brak aktywnej sesji użytkownika.",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found

```json
{
  "message": "Sesja treningowa nie została znaleziona.",
  "code": "NOT_FOUND"
}
```

lub

```json
{
  "message": "Ćwiczenie o podanej kolejności nie zostało znalezione w sesji.",
  "code": "NOT_FOUND"
}
```

### 409 Conflict

```json
{
  "message": "Sesja treningowa nie jest w statusie 'in_progress'.",
  "code": "CONFLICT"
}
```

### 500 Internal Server Error

```json
{
  "message": "Wystąpił błąd serwera.",
  "details": "Szczegóły błędu (tylko w development)"
}
```
