# Workout Plan JSON Import - przewodnik dla AI (tworzenie planu treningowego)

Ten dokument opisuje **akceptowalny format JSON** do importu planu treningowego w aplikacji, zgodnie z aktualną walidacją w kodzie (`workoutPlanImportSchema`) i logiką importu (`importWorkoutPlanService`).

Cel: umożliwić AI generowanie poprawnych planów treningowych do wklejenia / zapisania jako JSON i zaimportowania do aplikacji.

## 1. Co AI ma wygenerować

AI powinno wygenerować **jeden obiekt JSON** w formacie:

```json
{
  "name": "Nazwa planu",
  "description": "Opcjonalny opis",
  "part": "Legs",
  "exercises": [
    {
      "match_by_name": "Goblet Squat",
      "section_type": "Main Workout",
      "section_order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_rest_seconds": 60
    }
  ]
}
```

## 2. Struktura top-level (plan)

### Pola

- `name` (wymagane)
  - `string`
  - po `trim()`: min 1 znak, max 120

- `description` (opcjonalne)
  - `string | null`
  - max 1000 znaków

- `part` (opcjonalne)
  - `string | null`
  - dozwolone wartości:
    - `Legs`
    - `Core`
    - `Back`
    - `Arms`
    - `Chest`
    - `Glutes`

- `exercises` (wymagane)
  - tablica obiektów
  - minimum 1 element

## 3. `exercises[]` - jak opisać pozycję planu

Każda pozycja ćwiczenia musi mieć **jedną i tylko jedną** z metod identyfikacji:

### Opcja A: `exercise_id` (najbardziej precyzyjna)

Użyj, gdy znasz ID ćwiczenia z biblioteki użytkownika.

```json
{
  "exercise_id": "uuid...",
  "section_type": "Main Workout",
  "planned_sets": 4,
  "planned_reps": 8
}
```

### Opcja B: `match_by_name` (wyszukiwanie po nazwie)

Użyj, gdy nie znasz `exercise_id`, ale znasz nazwę ćwiczenia.

```json
{
  "match_by_name": "Romanian Deadlift",
  "section_type": "Main Workout",
  "planned_sets": 4,
  "planned_reps": 10
}
```

Jak działa import:
- aplikacja szuka ćwiczenia po nazwie (znormalizowanej, case-insensitive)
- jeśli znajdzie: zamienia na `exercise_id`
- jeśli nie znajdzie: tworzy **snapshot ćwiczenia w planie** (bez rekordu w bibliotece), z fallbackiem do domyślnych wartości

To oznacza, że `match_by_name` jest bezpieczne dla AI, nawet gdy ćwiczenia nie ma w bibliotece.

### Opcja C: snapshot ćwiczenia (`exercise_title`)

Użyj, gdy chcesz jawnie dodać pozycję jako snapshot (bez wyszukiwania w bibliotece).

```json
{
  "exercise_title": "Band Hip Abduction",
  "exercise_type": "Main Workout",
  "exercise_part": "Glutes",
  "exercise_details": "Powolny ruch, pauza 1s na końcu",
  "planned_sets": 3,
  "planned_reps": 15
}
```

## 4. Zasady walidacji identyfikacji ćwiczenia (bardzo ważne)

W każdej pozycji `exercises[]`:

- musisz podać **co najmniej jedno** z:
  - `exercise_id`
  - `match_by_name`
  - `exercise_title`

- nie wolno łączyć tych opcji parami:
  - `exercise_id` + `match_by_name` -> błąd
  - `exercise_id` + `exercise_title` (snapshot) -> błąd
  - `match_by_name` + `exercise_title` (snapshot) -> błąd

Praktyczna wskazówka dla AI:
- jeśli nie masz ID, używaj domyślnie `match_by_name`
- użyj `exercise_title` tylko wtedy, gdy chcesz wymusić snapshot lub dodać bardzo niestandardowe ćwiczenie

## 5. Pola pozycji ćwiczenia (akceptowane)

### Identyfikacja ćwiczenia (wybierz jedną ścieżkę)

- `exercise_id`: `string (UUID)` | `null`
- `match_by_name`: `string` | `null` (1-120 znaków)
- `exercise_title`: `string` | `null` (1-120 znaków)
- `exercise_type`: `"Warm-up" | "Main Workout" | "Cool-down" | null` (opcjonalne, snapshot)
- `exercise_part`: `"Legs" | "Core" | "Back" | "Arms" | "Chest" | "Glutes" | null` (opcjonalne, snapshot)
- `exercise_details`: `string | null` (max 1000, opcjonalne, snapshot)
- `exercise_is_unilateral`: `boolean | null` (opcjonalne)

### Pozycja w planie / sekcja

- `section_type`: `"Warm-up" | "Main Workout" | "Cool-down"` (opcjonalne)
- `section_order`: liczba całkowita > 0 (opcjonalne)

Jeśli AI pominie:
- `section_type` -> aplikacja domyślnie użyje `Main Workout`
- `section_order` -> aplikacja nada kolejność automatycznie na podstawie kolejności w JSON (osobno dla każdej sekcji)

### Scope (powtarzalny blok ćwiczeń)

Te pola służą do grupowania ćwiczeń w blok/superserię (scope):

- `scope_id`: `UUID | null` (opcjonalne)
- `in_scope_nr`: liczba całkowita > 0 | `null` (opcjonalne)
- `scope_repeat_count`: liczba całkowita >= 1 | `null` (opcjonalne)

Wskazówki:
- ćwiczenia z tym samym `scope_id` są traktowane jako jeden blok
- `in_scope_nr` określa kolejność w ramach bloku
- `scope_repeat_count` oznacza ile razy powtórzyć cały blok

Jeśli AI nie planuje bloków/superserii, najlepiej pominąć wszystkie pola `scope_*`.

### Parametry planowane (`planned_*`)

- `planned_sets`: liczba całkowita > 0 | `null`
- `planned_reps`: liczba całkowita > 0 | `null`
- `planned_duration_seconds`: liczba całkowita > 0 | `null`
- `planned_rest_seconds`: liczba całkowita >= 0 | `null`
- `planned_rest_after_series_seconds`: liczba całkowita >= 0 | `null`
- `estimated_set_time_seconds`: liczba całkowita > 0 | `null`

Interpretacja:
- ćwiczenia siłowe: zwykle `planned_sets` + `planned_reps`
- ćwiczenia czasowe: zwykle `planned_sets` + `planned_duration_seconds`
- `planned_rest_seconds`: przerwa między seriami
- `planned_rest_after_series_seconds`: przerwa po całym ćwiczeniu/bloku

## 6. Co jest "konieczne" do rozpisania pozycji planu

Minimalnie dla każdej pozycji ćwiczenia AI powinno podać:

1. Jedną metodę identyfikacji:
   - `match_by_name` (rekomendowane), albo
   - `exercise_id`, albo
   - `exercise_title`
2. Przynajmniej sensowne parametry treningowe:
   - najczęściej `planned_sets` + (`planned_reps` lub `planned_duration_seconds`)

Technicznie `section_type` i `section_order` mogą być pominięte (system uzupełni), ale dla lepszej czytelności planu warto je podawać.

## 7. Domyślne wartości i fallbacki podczas importu (ważne dla AI)

### Gdy `match_by_name` nie znajdzie ćwiczenia

Aplikacja:
- zamienia pozycję na snapshot (`exercise_title = match_by_name`)
- może uzupełnić:
  - `exercise_type` z `section_type`
  - `exercise_part` z `plan.part`
- stosuje domyślne wartości snapshotu (jeśli nie podano):
  - `section_type = "Main Workout"`
  - `planned_sets = 3`
  - `planned_rest_after_series_seconds = 60`
  - `estimated_set_time_seconds = 360`

### Gdy `exercise_id` wskazuje brakujące ćwiczenie

Import nie musi się wywrócić:
- pozycja może zostać przekonwertowana do snapshotu
- tytuł może zostać ustawiony jako placeholder (np. z ID)
- system dołoży domyślne parametry snapshotu

## 8. Reguły biznesowe (poza samym schema)

System dodatkowo pilnuje m.in.:
- plan musi mieć co najmniej jedno ćwiczenie
- kolejność pozycji w sekcji nie może się duplikować (po uwzględnieniu `section_type` + `section_order`)
- wartości `planned_*` muszą być dodatnie / nieujemne zgodnie z typem pola

Praktycznie dla AI:
- unikaj duplikowania `section_order` w tej samej sekcji
- najprościej numerować od 1 rosnąco w każdej sekcji

## 9. Rekomendowany styl generowania JSON przez AI

Najbezpieczniejszy wariant dla AI (bez znajomości ID ćwiczeń):
- używaj `match_by_name`
- zawsze podawaj `section_type`
- numeruj `section_order`
- podawaj `planned_sets` i `planned_reps` lub `planned_duration_seconds`
- podawaj `planned_rest_seconds`

## 10. Przykład kompletnego planu (mix `match_by_name` + snapshot + scope)

```json
{
  "name": "Glutes + Core (60 min)",
  "description": "Plan pod hipertrofię pośladków i stabilizację core",
  "part": "Glutes",
  "exercises": [
    {
      "match_by_name": "Glute Bridge",
      "section_type": "Warm-up",
      "section_order": 1,
      "planned_sets": 2,
      "planned_reps": 15,
      "planned_rest_seconds": 20
    },
    {
      "match_by_name": "Romanian Deadlift",
      "section_type": "Main Workout",
      "section_order": 1,
      "planned_sets": 4,
      "planned_reps": 10,
      "planned_rest_seconds": 90,
      "planned_rest_after_series_seconds": 90
    },
    {
      "match_by_name": "Bulgarian Split Squat",
      "section_type": "Main Workout",
      "section_order": 2,
      "scope_id": "11111111-1111-1111-1111-111111111111",
      "in_scope_nr": 1,
      "scope_repeat_count": 3,
      "planned_sets": 1,
      "planned_reps": 10,
      "planned_rest_seconds": 15
    },
    {
      "exercise_title": "Mini Band Lateral Walk",
      "exercise_type": "Main Workout",
      "exercise_part": "Glutes",
      "exercise_details": "Krótki krok, stałe napięcie gumy",
      "section_type": "Main Workout",
      "section_order": 3,
      "scope_id": "11111111-1111-1111-1111-111111111111",
      "in_scope_nr": 2,
      "scope_repeat_count": 3,
      "planned_sets": 1,
      "planned_duration_seconds": 45,
      "planned_rest_seconds": 45
    },
    {
      "match_by_name": "Plank",
      "section_type": "Cool-down",
      "section_order": 1,
      "planned_sets": 2,
      "planned_duration_seconds": 45,
      "planned_rest_seconds": 30
    }
  ]
}
```

## 11. Gotowy prompt dla AI (żeby wygenerować poprawny JSON)

Możesz użyć promptu:

> Wygeneruj plan treningowy w poprawnym JSON do importu do aplikacji. Zwróć tylko JSON (bez markdown). Używaj `match_by_name` zamiast `exercise_id`, jeśli nie znasz ID. Dla każdego ćwiczenia podaj `section_type`, `section_order`, oraz parametry `planned_*` (sets+reps albo sets+duration_seconds oraz rest). Jeśli dodajesz ćwiczenie niestandardowe, użyj `exercise_title` (snapshot), bez `match_by_name`.

## 12. Najczęstsze błędy, których AI ma unikać

- Łączenie `match_by_name` i `exercise_title` w jednej pozycji
- Łączenie `exercise_id` z `match_by_name`
- Brak `exercises[]` albo pusta tablica
- Duplikaty `section_order` w tej samej sekcji
- `planned_sets = 0` albo wartości ujemne w `planned_*`
- Zwracanie komentarzy / tekstu poza JSON (gdy celem jest import)
