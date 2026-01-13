# Przykłady użycia API dla rekordów osobistych (Personal Records)

## 1. GET - Lista rekordów osobistych (bez filtrów)

**Endpoint:** `GET /api/personal-records`

**Query Parameters:** Brak (używa domyślnych wartości: sort=achieved_at, order=desc, limit=20)

**Example:**

```bash
GET /api/personal-records
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    },
    {
      "id": "pr-uuid-2",
      "exercise_id": "exercise-uuid-2",
      "metric_type": "total_reps",
      "value": 100,
      "achieved_at": "2024-01-14T09:15:00Z",
      "achieved_in_session_id": "session-uuid-2",
      "achieved_in_set_number": null,
      "created_at": "2024-01-14T09:15:00Z",
      "updated_at": "2024-01-14T09:15:00Z",
      "exercise": {
        "id": "exercise-uuid-2",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    }
  ],
  "nextCursor": "eyJzb3J0IjoiYWNoaWV2ZWRfYXQiLCJvcmRlciI6ImRlc2MiLCJ2YWx1ZSI6IjIwMjQtMDEtMTRUMDk6MTU6MDBaIiwiaWQiOiJwci11dWlkLTIifQ"
}
```

---

## 2. GET - Lista rekordów osobistych z filtrem exercise_id

**Endpoint:** `GET /api/personal-records`

**Query Parameters:**

- `exercise_id`: UUID ćwiczenia (opcjonalny)

**Example:**

```bash
GET /api/personal-records?exercise_id=exercise-uuid-1
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    }
  ],
  "nextCursor": null
}
```

---

## 3. GET - Lista rekordów osobistych z filtrem metric_type

**Endpoint:** `GET /api/personal-records`

**Query Parameters:**

- `metric_type`: Typ metryki (`total_reps`, `max_duration`, `max_weight`)

**Example:**

```bash
GET /api/personal-records?metric_type=max_weight
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    },
    {
      "id": "pr-uuid-3",
      "exercise_id": "exercise-uuid-3",
      "metric_type": "max_weight",
      "value": 80.0,
      "achieved_at": "2024-01-13T14:20:00Z",
      "achieved_in_session_id": "session-uuid-3",
      "achieved_in_set_number": 2,
      "created_at": "2024-01-13T14:20:00Z",
      "updated_at": "2024-01-13T14:20:00Z",
      "exercise": {
        "id": "exercise-uuid-3",
        "title": "Deadlift",
        "type": "Main Workout",
        "part": "Back"
      }
    }
  ],
  "nextCursor": null
}
```

---

## 4. GET - Lista rekordów osobistych z sortowaniem po value

**Endpoint:** `GET /api/personal-records`

**Query Parameters:**

- `sort`: Pole sortowania (`achieved_at` lub `value`)
- `order`: Kierunek sortowania (`asc` lub `desc`)

**Example:**

```bash
GET /api/personal-records?sort=value&order=desc
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-3",
      "exercise_id": "exercise-uuid-3",
      "metric_type": "max_weight",
      "value": 80.0,
      "achieved_at": "2024-01-13T14:20:00Z",
      "achieved_in_session_id": "session-uuid-3",
      "achieved_in_set_number": 2,
      "created_at": "2024-01-13T14:20:00Z",
      "updated_at": "2024-01-13T14:20:00Z",
      "exercise": {
        "id": "exercise-uuid-3",
        "title": "Deadlift",
        "type": "Main Workout",
        "part": "Back"
      }
    },
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    }
  ],
  "nextCursor": null
}
```

---

## 5. GET - Lista rekordów osobistych z paginacją (cursor)

**Endpoint:** `GET /api/personal-records`

**Query Parameters:**

- `limit`: Liczba wyników na stronę (domyślnie: 20, max: 100)
- `cursor`: Kursor paginacji (base64url encoded JSON)

**Example - Pierwsza strona:**

```bash
GET /api/personal-records?limit=2
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    },
    {
      "id": "pr-uuid-2",
      "exercise_id": "exercise-uuid-2",
      "metric_type": "total_reps",
      "value": 100,
      "achieved_at": "2024-01-14T09:15:00Z",
      "achieved_in_session_id": "session-uuid-2",
      "achieved_in_set_number": null,
      "created_at": "2024-01-14T09:15:00Z",
      "updated_at": "2024-01-14T09:15:00Z",
      "exercise": {
        "id": "exercise-uuid-2",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    }
  ],
  "nextCursor": "eyJzb3J0IjoiYWNoaWV2ZWRfYXQiLCJvcmRlciI6ImRlc2MiLCJ2YWx1ZSI6IjIwMjQtMDEtMTRUMDk6MTU6MDBaIiwiaWQiOiJwci11dWlkLTIifQ"
}
```

**Example - Druga strona (używając kursora):**

```bash
GET /api/personal-records?limit=2&cursor=eyJzb3J0IjoiYWNoaWV2ZWRfYXQiLCJvcmRlciI6ImRlc2MiLCJ2YWx1ZSI6IjIwMjQtMDEtMTRUMDk6MTU6MDBaIiwiaWQiOiJwci11dWlkLTIifQ
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-3",
      "exercise_id": "exercise-uuid-3",
      "metric_type": "max_duration",
      "value": 120,
      "achieved_at": "2024-01-13T14:20:00Z",
      "achieved_in_session_id": "session-uuid-3",
      "achieved_in_set_number": 1,
      "created_at": "2024-01-13T14:20:00Z",
      "updated_at": "2024-01-13T14:20:00Z",
      "exercise": {
        "id": "exercise-uuid-3",
        "title": "Plank",
        "type": "Main Workout",
        "part": "Core"
      }
    }
  ],
  "nextCursor": null
}
```

---

## 6. GET - Lista rekordów osobistych z kombinacją filtrów

**Endpoint:** `GET /api/personal-records`

**Query Parameters:**

- `exercise_id`: UUID ćwiczenia
- `metric_type`: Typ metryki
- `sort`: Pole sortowania
- `order`: Kierunek sortowania
- `limit`: Liczba wyników

**Example:**

```bash
GET /api/personal-records?exercise_id=exercise-uuid-1&metric_type=max_weight&sort=value&order=desc&limit=10
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-1",
      "exercise_id": "exercise-uuid-1",
      "metric_type": "max_weight",
      "value": 50.5,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-1",
      "achieved_in_set_number": 3,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-1",
        "title": "Bench Press",
        "type": "Main Workout",
        "part": "Chest"
      }
    }
  ],
  "nextCursor": null
}
```

---

## 7. GET - Wszystkie rekordy dla konkretnego ćwiczenia

**Endpoint:** `GET /api/personal-records/{exercise_id}`

**Path Parameters:**

- `exercise_id`: UUID ćwiczenia (wymagany)

**Example:**

```bash
GET /api/personal-records/exercise-uuid-2
```

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "pr-uuid-2",
      "exercise_id": "exercise-uuid-2",
      "metric_type": "total_reps",
      "value": 100,
      "achieved_at": "2024-01-15T10:30:00Z",
      "achieved_in_session_id": "session-uuid-2",
      "achieved_in_set_number": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "exercise": {
        "id": "exercise-uuid-2",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    },
    {
      "id": "pr-uuid-4",
      "exercise_id": "exercise-uuid-2",
      "metric_type": "max_duration",
      "value": 120,
      "achieved_at": "2024-01-14T09:15:00Z",
      "achieved_in_session_id": "session-uuid-4",
      "achieved_in_set_number": 1,
      "created_at": "2024-01-14T09:15:00Z",
      "updated_at": "2024-01-14T09:15:00Z",
      "exercise": {
        "id": "exercise-uuid-2",
        "title": "Push-ups",
        "type": "Main Workout",
        "part": "Arms"
      }
    }
  ]
}
```

**Uwaga:** Ten endpoint zwraca wszystkie typy metryk dla danego ćwiczenia, posortowane po `metric_type`.

---

## 8. Przykłady błędów

### 8.1 Nieprawidłowy format UUID

**Request:**

```bash
GET /api/personal-records/invalid-uuid
```

**Response (400 Bad Request):**

```json
{
  "message": "Nieprawidłowy format UUID ćwiczenia.",
  "code": "BAD_REQUEST"
}
```

---

### 8.2 Nieprawidłowy kursor paginacji

**Request:**

```bash
GET /api/personal-records?cursor=invalid-cursor
```

**Response (400 Bad Request):**

```json
{
  "message": "Nieprawidłowy kursor paginacji.",
  "code": "BAD_REQUEST"
}
```

---

### 8.3 Nieprawidłowy typ metryki

**Request:**

```bash
GET /api/personal-records?metric_type=invalid_type
```

**Response (400 Bad Request):**

```json
{
  "message": "Invalid enum value. Expected 'total_reps' | 'max_duration' | 'max_weight', received 'invalid_type'",
  "code": "BAD_REQUEST"
}
```

---

### 8.4 Ćwiczenie nie znalezione

**Request:**

```bash
GET /api/personal-records/00000000-0000-0000-0000-000000000000
```

**Response (404 Not Found):**

```json
{
  "message": "Ćwiczenie nie zostało znalezione.",
  "code": "NOT_FOUND"
}
```

---

### 8.5 Limit poza zakresem

**Request:**

```bash
GET /api/personal-records?limit=200
```

**Response (400 Bad Request):**

```json
{
  "message": "Number must be less than or equal to 100",
  "code": "BAD_REQUEST"
}
```

---

## 9. Opis pól odpowiedzi

### PersonalRecordWithExerciseDTO

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string (UUID) | Unikalny identyfikator rekordu osobistego |
| `exercise_id` | string (UUID) | ID ćwiczenia, dla którego został osiągnięty rekord |
| `metric_type` | enum | Typ metryki: `total_reps`, `max_duration`, `max_weight` |
| `value` | number | Wartość rekordu (zależna od typu metryki) |
| `achieved_at` | string (ISO 8601) | Data i czas osiągnięcia rekordu |
| `achieved_in_session_id` | string (UUID) \| null | ID sesji treningowej, w której został osiągnięty rekord |
| `achieved_in_set_number` | number \| null | Numer serii, w której został osiągnięty rekord (null dla total_reps) |
| `created_at` | string (ISO 8601) | Data utworzenia rekordu |
| `updated_at` | string (ISO 8601) | Data ostatniej aktualizacji rekordu |
| `exercise` | object | Metadane ćwiczenia |
| `exercise.id` | string (UUID) | ID ćwiczenia |
| `exercise.title` | string | Nazwa ćwiczenia |
| `exercise.type` | enum | Typ ćwiczenia: `Warm-up`, `Main Workout`, `Cool-down` |
| `exercise.part` | enum | Partia mięśniowa: `Legs`, `Core`, `Back`, `Arms`, `Chest` |

### Typy metryk (PRMetricType)

- **`total_reps`**: Suma wszystkich powtórzeń ze wszystkich sesji dla danego ćwiczenia
- **`max_duration`**: Maksymalny czas trwania pojedynczej serii (w sekundach)
- **`max_weight`**: Maksymalna waga użyta w pojedynczej serii (w kilogramach)

---

## 10. Uwagi implementacyjne

1. **Paginacja**: Używa cursor-based pagination dla lepszej wydajności. Kursor jest base64url-encoded JSON zawierający: `sort`, `order`, `value`, `id`.

2. **Sortowanie**: Domyślnie sortuje po `achieved_at` w porządku malejącym (`desc`). Można sortować również po `value`.

3. **Filtrowanie**: Można łączyć filtry `exercise_id` i `metric_type`.

4. **RLS**: Wszystkie zapytania są automatycznie filtrowane przez Row-Level Security (RLS), więc użytkownik widzi tylko swoje rekordy.

5. **Weryfikacja własności**: Endpoint `/api/personal-records/{exercise_id}` weryfikuje, że ćwiczenie należy do użytkownika przed zwróceniem rekordów.
