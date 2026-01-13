# Plan implementacji widoku formularza tworzenia/edycji ćwiczenia

## 1. Przegląd

Widok formularza tworzenia/edycji ćwiczenia umożliwia użytkowniczce dodanie nowego ćwiczenia do biblioteki lub edycję istniejącego ćwiczenia. Formularz zawiera pełną walidację zgodną z regułami biznesowymi API, w tym walidację unikalności tytułu (case-insensitive), wymaganie co najmniej jednej metryki (reps XOR duration_seconds), wymaganie co najmniej jednego pola odpoczynku (rest_in_between_seconds OR rest_after_series_seconds) oraz wymaganie, aby series było większe od zera.

Widok obsługuje dwa tryby:

- **Tworzenie**: `/exercises/new` - pusty formularz do dodania nowego ćwiczenia
- **Edycja**: `/exercises/[id]/edit` - formularz wypełniony danymi istniejącego ćwiczenia

Formularz implementuje dwupoziomową walidację (klient + serwer), wyświetla komunikaty błędów inline przy polach, obsługuje potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami oraz przekierowuje do listy ćwiczeń po udanym zapisie.

## 2. Routing widoku

Widok jest dostępny pod dwoma ścieżkami:

- **Tworzenie**: `/exercises/new` - Server Component page z pustym formularzem
- **Edycja**: `/exercises/[id]/edit` - Server Component page z formularzem wypełnionym danymi ćwiczenia

Struktura plików:

```
src/app/exercises/
  ├── new/
  │   └── page.tsx          # Server Component - tworzenie
  ├── [id]/
  │   └── edit/
  │       └── page.tsx      # Server Component - edycja
  └── page.tsx              # Lista ćwiczeń (istniejący)
```

## 3. Struktura komponentów

```
ExerciseFormPage (Server Component)
  └── ExerciseForm (Client Component)
      ├── ExerciseFormFields (Client Component)
      │   ├── TextInput (title)
      │   ├── Select (type)
      │   ├── Select (part)
      │   ├── TextInput (level - opcjonalny)
      │   ├── Textarea (details - opcjonalny)
      │   ├── NumberInput (reps - opcjonalny)
      │   ├── NumberInput (duration_seconds - opcjonalny)
      │   ├── NumberInput (series - required)
      │   ├── NumberInput (rest_in_between_seconds - opcjonalny)
      │   └── NumberInput (rest_after_series_seconds - opcjonalny)
      ├── ValidationErrors (Client Component)
      ├── SaveButton (Client Component)
      └── CancelButton (Client Component)
```

## 4. Szczegóły komponentów

### ExerciseFormPage (Server Component)

**Opis komponentu**: Główny komponent strony odpowiedzialny za pobranie danych ćwiczenia (w trybie edycji) i renderowanie formularza. W trybie tworzenia renderuje pusty formularz, w trybie edycji pobiera dane przez `getExerciseService` i przekazuje je do formularza.

**Główne elementy**:

- Header z tytułem strony ("Dodaj ćwiczenie" / "Edytuj ćwiczenie")
- Komponent `ExerciseForm` z odpowiednimi props

**Obsługiwane zdarzenia**: Brak (Server Component)

**Obsługiwana walidacja**: Brak (walidacja w Client Component)

**Typy**:

- Props: `{ params?: Promise<{ id: string }> }` (dla edycji)
- Używa: `ExerciseDTO` z API

**Props**: Brak (komponent strony Next.js)

### ExerciseForm (Client Component)

**Opis komponentu**: Główny komponent formularza odpowiedzialny za zarządzanie stanem formularza, walidację po stronie klienta (Zod), obsługę submit, integrację z API oraz zarządzanie stanem niezapisanych zmian (dla potwierdzenia przed opuszczeniem).

**Główne elementy**:

- `<form>` element z `onSubmit` handler
- `ExerciseFormFields` - pola formularza
- `ValidationErrors` - wyświetlanie błędów walidacji
- `SaveButton` - przycisk zapisu z loading state
- `CancelButton` - przycisk anulowania

**Obsługiwane zdarzenia**:

- `onSubmit` - walidacja i wysłanie żądania do API
- `onChange` - aktualizacja stanu formularza i walidacja w czasie rzeczywistym
- `onBlur` - walidacja pola po opuszczeniu
- `beforeunload` - potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami

**Obsługiwana walidacja**:

- Walidacja po stronie klienta (Zod) przed wysłaniem:
  - `title`: wymagane, string, trim, min 1, max 120 znaków
  - `type`: wymagane, enum (Warm-up | Main Workout | Cool-down)
  - `part`: wymagane, enum (Legs | Core | Back | Arms | Chest)
  - `level`: opcjonalny, string, trim, min 1, max 60 znaków, nullable
  - `details`: opcjonalny, string, trim, min 1, max 1000 znaków, nullable
  - `reps`: opcjonalny, number, integer, positive, nullable
  - `duration_seconds`: opcjonalny, number, integer, positive, nullable
  - `series`: wymagane, number, integer, positive (> 0)
  - `rest_in_between_seconds`: opcjonalny, number, integer, nonnegative, nullable
  - `rest_after_series_seconds`: opcjonalny, number, integer, nonnegative, nullable
- Reguły biznesowe:
  - Co najmniej jedno z: `reps` XOR `duration_seconds` (nie mogą być oba jednocześnie)
  - Co najmniej jedno z: `rest_in_between_seconds` OR `rest_after_series_seconds`
  - `series` > 0
- Walidacja unikalności tytułu (tylko po stronie serwera, komunikat 409)

**Typy**:

- Props: `{ initialData?: ExerciseDTO; mode: 'create' | 'edit' }`
- Stan: `ExerciseFormState` (ViewModel)
- Używa: `ExerciseCreateCommand`, `ExerciseUpdateCommand`, `ExerciseDTO`

**Props**:

- `initialData?: ExerciseDTO` - dane ćwiczenia do edycji (undefined dla tworzenia)
- `mode: 'create' | 'edit'` - tryb formularza

### ExerciseFormFields (Client Component)

**Opis komponentu**: Komponent renderujący wszystkie pola formularza z walidacją inline. Każde pole wyświetla błędy walidacji bezpośrednio pod sobą.

**Główne elementy**:

- TextInput dla `title` (required)
- Select dla `type` (required, enum)
- Select dla `part` (required, enum)
- TextInput dla `level` (opcjonalny)
- Textarea dla `details` (opcjonalny)
- NumberInput dla `reps` (opcjonalny, jeśli duration nie jest ustawiony)
- NumberInput dla `duration_seconds` (opcjonalny, jeśli reps nie jest ustawiony)
- NumberInput dla `series` (required, > 0)
- NumberInput dla `rest_in_between_seconds` (opcjonalny, jeśli rest_after_series nie jest ustawiony)
- NumberInput dla `rest_after_series_seconds` (opcjonalny, jeśli rest_in_between nie jest ustawiony)

**Obsługiwane zdarzenia**:

- `onChange` - przekazywane do rodzica (ExerciseForm)
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:

- Walidacja inline dla każdego pola zgodnie z regułami Zod
- Wyświetlanie błędów pod każdym polem
- `aria-invalid="true"` dla pól z błędami
- `aria-describedby` wskazujące na element z komunikatem błędu

**Typy**:

- Props: `ExerciseFormFieldsProps`
- Używa: `ExerciseFormState` (ViewModel)

**Props**:

- `fields: ExerciseFormState` - stan formularza
- `errors: Record<string, string>` - błędy walidacji per pole
- `onChange: (field: string, value: unknown) => void` - handler zmiany wartości
- `onBlur: (field: string) => void` - handler opuszczenia pola
- `disabled: boolean` - czy formularz jest zablokowany (podczas zapisu)

### ValidationErrors (Client Component)

**Opis komponentu**: Komponent wyświetlający błędy walidacji na poziomie formularza (reguły biznesowe, które nie są przypisane do konkretnego pola, np. "Podaj dokładnie jedno z pól: reps lub duration_seconds").

**Główne elementy**:

- Lista błędów walidacji jako `<ul>` z `<li>` elementami
- Każdy błąd z ikoną błędu i komunikatem

**Obsługiwane zdarzenia**: Brak

**Obsługiwana walidacja**: Wyświetlanie błędów reguł biznesowych

**Typy**:

- Props: `{ errors: string[] }`

**Props**:

- `errors: string[]` - tablica komunikatów błędów

### SaveButton (Client Component)

**Opis komponentu**: Przycisk zapisu z loading state i obsługą błędów API.

**Główne elementy**:

- Button z tekstem "Zapisz" / "Zapisywanie..." (podczas zapisu)
- Ikona spinner podczas zapisu
- Disabled state podczas zapisu

**Obsługiwane zdarzenia**:

- `onClick` - wywołanie submit formularza (przez form onSubmit)

**Obsługiwana walidacja**: Brak (walidacja w ExerciseForm)

**Typy**:

- Props: `{ isLoading: boolean; disabled?: boolean }`

**Props**:

- `isLoading: boolean` - czy trwa zapis
- `disabled?: boolean` - czy przycisk jest zablokowany

### CancelButton (Client Component)

**Opis komponentu**: Przycisk anulowania z potwierdzeniem przed opuszczeniem, jeśli są niezapisane zmiany.

**Główne elementy**:

- Button z tekstem "Anuluj"
- Link do `/exercises` (lista ćwiczeń)
- Dialog potwierdzenia (jeśli są niezapisane zmiany)

**Obsługiwane zdarzenia**:

- `onClick` - sprawdzenie niezapisanych zmian i wyświetlenie dialogu lub przekierowanie

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: `{ hasUnsavedChanges: boolean }`

**Props**:

- `hasUnsavedChanges: boolean` - czy są niezapisane zmiany

## 5. Typy

### Typy DTO (Data Transfer Objects)

#### ExerciseDTO

```typescript
type ExerciseDTO = {
  id: string;
  title: string;
  type: ExerciseType; // "Warm-up" | "Main Workout" | "Cool-down"
  part: ExercisePart; // "Legs" | "Core" | "Back" | "Arms" | "Chest"
  level: string | null;
  details: string | null;
  reps: number | null;
  duration_seconds: number | null;
  series: number;
  rest_in_between_seconds: number | null;
  rest_after_series_seconds: number | null;
  created_at: string;
  updated_at: string;
};
```

#### ExerciseCreateCommand

```typescript
type ExerciseCreateCommand = {
  title: string;
  type: ExerciseType;
  part: ExercisePart;
  level?: string | null;
  details?: string | null;
  reps?: number | null;
  duration_seconds?: number | null;
  series: number;
  rest_in_between_seconds?: number | null;
  rest_after_series_seconds?: number | null;
};
```

#### ExerciseUpdateCommand

```typescript
type ExerciseUpdateCommand = Partial<ExerciseCreateCommand>;
```

### Typy ViewModel (dla komponentów)

#### ExerciseFormState

```typescript
type ExerciseFormState = {
  title: string;
  type: ExerciseType | "";
  part: ExercisePart | "";
  level: string;
  details: string;
  reps: string; // string dla NumberInput (łatwiejsza obsługa pustych wartości)
  duration_seconds: string;
  series: string;
  rest_in_between_seconds: string;
  rest_after_series_seconds: string;
};
```

**Uwaga**: Pola numeryczne są przechowywane jako stringi w stanie formularza, aby ułatwić obsługę pustych wartości i walidację. Konwersja do number następuje przed wysłaniem do API.

#### ExerciseFormErrors

```typescript
type ExerciseFormErrors = {
  title?: string;
  type?: string;
  part?: string;
  level?: string;
  details?: string;
  reps?: string;
  duration_seconds?: string;
  series?: string;
  rest_in_between_seconds?: string;
  rest_after_series_seconds?: string;
  _form?: string[]; // Błędy na poziomie formularza (reguły biznesowe)
};
```

#### ExerciseFormFieldsProps

```typescript
type ExerciseFormFieldsProps = {
  fields: ExerciseFormState;
  errors: ExerciseFormErrors;
  onChange: (field: keyof ExerciseFormState, value: string) => void;
  onBlur: (field: keyof ExerciseFormState) => void;
  disabled: boolean;
};
```

## 6. Zarządzanie stanem

Zarządzanie stanem odbywa się lokalnie w komponencie `ExerciseForm` przy użyciu React hooks:

### Stan formularza

- `useState<ExerciseFormState>` - stan pól formularza
- `useState<ExerciseFormErrors>` - błędy walidacji
- `useState<boolean>` - loading state (czy trwa zapis)
- `useState<boolean>` - czy są niezapisane zmiany (dla potwierdzenia przed opuszczeniem)

### Custom hook: `useExerciseForm`

**Cel**: Enkapsulacja logiki formularza (walidacja, submit, zarządzanie stanem)

**Zwraca**:

```typescript
{
  fields: ExerciseFormState;
  errors: ExerciseFormErrors;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  handleChange: (field: keyof ExerciseFormState, value: string) => void;
  handleBlur: (field: keyof ExerciseFormState) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
}
```

**Funkcjonalność**:

- Inicjalizacja stanu z `initialData` (dla edycji) lub pustymi wartościami (dla tworzenia)
- Walidacja pojedynczych pól przy `onBlur`
- Walidacja całego formularza przy `onSubmit` (Zod)
- Obsługa submit z wywołaniem API (POST dla tworzenia, PATCH dla edycji)
- Zarządzanie loading state
- Śledzenie niezapisanych zmian (porównanie z `initialData`)
- Reset formularza po udanym zapisie

### Hook: `useBeforeUnload`

**Cel**: Potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami

**Implementacja**: `useEffect` z `beforeunload` event listener

## 7. Integracja API

### Endpoint: POST /api/exercises (tworzenie)

**Typ żądania**:

```typescript
POST /api/exercises
Content-Type: application/json

Body: ExerciseCreateCommand
```

**Typ odpowiedzi**:

- **Sukces (201)**: `ExerciseDTO`
- **Błąd walidacji (400)**: `{ message: string; code: "BAD_REQUEST"; details?: string }`
- **Duplikat tytułu (409)**: `{ message: "Ćwiczenie o podanym tytule już istnieje."; code: "CONFLICT" }`
- **Błąd autoryzacji (401/403)**: `{ message: string; code: "UNAUTHORIZED" | "FORBIDDEN" }`
- **Błąd serwera (500)**: `{ message: "Wystąpił błąd serwera."; code: "INTERNAL" }`

### Endpoint: PATCH /api/exercises/[id] (edycja)

**Typ żądania**:

```typescript
PATCH /api/exercises/[id]
Content-Type: application/json

Body: ExerciseUpdateCommand
```

**Typ odpowiedzi**:

- **Sukces (200)**: `ExerciseDTO`
- **Błąd walidacji (400)**: `{ message: string; code: "BAD_REQUEST"; details?: string }`
- **Duplikat tytułu (409)**: `{ message: "Ćwiczenie o podanym tytule już istnieje."; code: "CONFLICT" }`
- **Nie znaleziono (404)**: `{ message: "Ćwiczenie nie zostało znalezione."; code: "NOT_FOUND" }`
- **Błąd autoryzacji (401/403)**: `{ message: string; code: "UNAUTHORIZED" | "FORBIDDEN" }`
- **Błąd serwera (500)**: `{ message: "Wystąpił błąd serwera."; code: "INTERNAL" }`

### Endpoint: GET /api/exercises/[id] (pobranie do edycji)

**Typ żądania**:

```typescript
GET / api / exercises / [id];
```

**Typ odpowiedzi**:

- **Sukces (200)**: `ExerciseDTO`
- **Nie znaleziono (404)**: `{ message: "Ćwiczenie nie zostało znalezione."; code: "NOT_FOUND" }`
- **Błąd autoryzacji (401/403)**: `{ message: string; code: "UNAUTHORIZED" | "FORBIDDEN" }`
- **Błąd serwera (500)**: `{ message: "Wystąpił błąd serwera."; code: "INTERNAL" }`

### Implementacja wywołań API

Wywołania API są realizowane w komponencie `ExerciseForm` przy użyciu `fetch`:

```typescript
// Tworzenie
const response = await fetch("/api/exercises", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(transformedData),
});

// Edycja
const response = await fetch(`/api/exercises/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(transformedData),
});
```

**Obsługa odpowiedzi**:

- Sukces: toast notification + przekierowanie do `/exercises`
- Błąd 400: wyświetlenie błędów walidacji w formularzu
- Błąd 409: wyświetlenie komunikatu "Ćwiczenie o tej nazwie już istnieje" przy polu `title`
- Inne błędy: toast notification z komunikatem błędu

## 8. Interakcje użytkownika

### 8.1 Wypełnianie formularza

**Akcja**: Użytkowniczka wprowadza dane do pól formularza

**Rezultat**:

- Stan formularza jest aktualizowany w czasie rzeczywistym
- Flaga `hasUnsavedChanges` jest ustawiana na `true`
- Walidacja inline jest wykonywana przy `onBlur` (opuszczenie pola)

### 8.2 Walidacja inline

**Akcja**: Użytkowniczka opuszcza pole (`onBlur`)

**Rezultat**:

- Walidacja pojedynczego pola (Zod)
- Wyświetlenie błędu pod polem (jeśli błąd)
- Ustawienie `aria-invalid="true"` dla pola z błędem

### 8.3 Zapis formularza

**Akcja**: Użytkowniczka klika "Zapisz" lub naciska Enter w formularzu

**Rezultat**:

1. Walidacja całego formularza (Zod + reguły biznesowe)
2. Jeśli błędy: wyświetlenie błędów w formularzu, brak wysłania żądania
3. Jeśli OK:
   - Ustawienie `isLoading = true`
   - Wysłanie żądania do API (POST dla tworzenia, PATCH dla edycji)
   - Oczekiwanie na odpowiedź
4. **Sukces**:
   - Toast notification: "Ćwiczenie zostało zapisane"
   - Przekierowanie do `/exercises`
5. **Błąd**:
   - Wyświetlenie błędów w formularzu (dla 400)
   - Toast notification z komunikatem błędu (dla innych kodów)
   - `isLoading = false`
   - Dane pozostają w formularzu

### 8.4 Anulowanie

**Akcja**: Użytkowniczka klika "Anuluj"

**Rezultat**:

- Jeśli `hasUnsavedChanges === false`: natychmiastowe przekierowanie do `/exercises`
- Jeśli `hasUnsavedChanges === true`: wyświetlenie dialogu potwierdzenia:
  - "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?"
  - Przyciski: "Zostań" / "Opuszczam"
  - Po potwierdzeniu: przekierowanie do `/exercises`

### 8.5 Próba opuszczenia strony

**Akcja**: Użytkowniczka próbuje zamknąć kartę/nawigować gdzie indziej z niezapisanymi zmianami

**Rezultat**:

- Wyświetlenie natywnego dialogu przeglądarki: "Czy na pewno chcesz opuścić tę stronę? Wprowadzone zmiany mogą nie zostać zapisane."
- Opcje: "Zostań na stronie" / "Opuszczam stronę"

### 8.6 Focus management

**Akcja**: Załadowanie strony (tworzenie) lub załadowanie danych (edycja)

**Rezultat**:

- Automatyczne ustawienie focus na pierwsze pole (`title`) przy załadowaniu formularza

## 9. Warunki i walidacja

### 9.1 Walidacja pól wymaganych

**Pola wymagane**:

- `title`: string, nie może być pusty (po trim), max 120 znaków
- `type`: enum, musi być wybrany
- `part`: enum, musi być wybrany
- `series`: number, integer, > 0

**Komponenty**: `ExerciseFormFields` - wyświetlanie błędów pod polami

**Wpływ na stan**: Formularz nie może być zapisany, jeśli pola wymagane są puste lub nieprawidłowe

### 9.2 Walidacja reguły: reps XOR duration_seconds

**Warunek**: Dokładnie jedno z pól `reps` lub `duration_seconds` musi być wypełnione (nie mogą być oba jednocześnie)

**Komponenty**: `ExerciseForm` - walidacja w `useExerciseForm` hook, `ValidationErrors` - wyświetlanie błędu

**Komunikat błędu**: "Podaj dokładnie jedno z pól: reps lub duration_seconds."

**Wpływ na stan**: Błąd wyświetlany w `ValidationErrors`, formularz nie może być zapisany

### 9.3 Walidacja reguły: rest_in_between_seconds OR rest_after_series_seconds

**Warunek**: Co najmniej jedno z pól `rest_in_between_seconds` lub `rest_after_series_seconds` musi być wypełnione

**Komponenty**: `ExerciseForm` - walidacja w `useExerciseForm` hook, `ValidationErrors` - wyświetlanie błędu

**Komunikat błędu**: "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds)."

**Wpływ na stan**: Błąd wyświetlany w `ValidationErrors`, formularz nie może być zapisany

### 9.4 Walidacja: series > 0

**Warunek**: `series` musi być liczbą całkowitą większą od zera

**Komponenty**: `ExerciseFormFields` - walidacja pola `series`

**Komunikat błędu**: "Pole series musi być większe od zera."

**Wpływ na stan**: Błąd wyświetlany pod polem `series`, formularz nie może być zapisany

### 9.5 Walidacja unikalności tytułu

**Warunek**: Tytuł ćwiczenia musi być unikalny (case-insensitive, po normalizacji: trim + lowercase + redukcja wielokrotnych spacji)

**Komponenty**: `ExerciseForm` - obsługa odpowiedzi API z kodem 409

**Komunikat błędu**: "Ćwiczenie o tej nazwie już istnieje" (wyświetlany przy polu `title`)

**Wpływ na stan**: Błąd wyświetlany przy polu `title`, formularz nie może być zapisany

**Uwaga**: Walidacja unikalności jest wykonywana tylko po stronie serwera (API). Frontend nie wykonuje wstępnej walidacji unikalności przed wysłaniem (można dodać opcjonalnie dla lepszego UX, ale nie jest wymagane).

### 9.6 Walidacja zakresów wartości

**Pola numeryczne**:

- `reps`: integer, positive (> 0), nullable
- `duration_seconds`: integer, positive (> 0), nullable
- `series`: integer, positive (> 0), required
- `rest_in_between_seconds`: integer, nonnegative (≥ 0), nullable
- `rest_after_series_seconds`: integer, nonnegative (≥ 0), nullable

**Komponenty**: `ExerciseFormFields` - walidacja przy `onBlur` i `onSubmit`

**Wpływ na stan**: Błędy wyświetlane pod odpowiednimi polami, formularz nie może być zapisany

### 9.7 Walidacja długości tekstu

**Pola tekstowe**:

- `title`: max 120 znaków
- `level`: max 60 znaków (jeśli wypełnione)
- `details`: max 1000 znaków (jeśli wypełnione)

**Komponenty**: `ExerciseFormFields` - walidacja przy `onBlur` i `onSubmit`

**Wpływ na stan**: Błędy wyświetlane pod odpowiednimi polami, formularz nie może być zapisany

## 10. Obsługa błędów

### 10.1 Błąd walidacji (400)

**Scenariusz**: API zwraca błąd 400 z komunikatami walidacji

**Obsługa**:

- Parsowanie odpowiedzi API: `{ message: string; code: "BAD_REQUEST"; details?: string }`
- Wyświetlenie błędów w formularzu:
  - Błędy pól → wyświetlenie przy odpowiednich polach
  - Błędy reguł biznesowych → wyświetlenie w `ValidationErrors`
- Formularz pozostaje wypełniony, użytkowniczka może poprawić błędy

**Implementacja**:

```typescript
if (response.status === 400) {
  const error = await response.json();
  // Parsowanie błędów i przypisanie do odpowiednich pól
  setErrors(parseValidationErrors(error));
}
```

### 10.2 Duplikat tytułu (409)

**Scenariusz**: API zwraca błąd 409 (ćwiczenie o tym samym tytule już istnieje)

**Obsługa**:

- Wyświetlenie komunikatu "Ćwiczenie o tej nazwie już istnieje" przy polu `title`
- Ustawienie `aria-invalid="true"` dla pola `title`
- Formularz pozostaje wypełniony, użytkowniczka może zmienić tytuł

**Implementacja**:

```typescript
if (response.status === 409) {
  setErrors({
    title: "Ćwiczenie o tej nazwie już istnieje",
  });
}
```

### 10.3 Nie znaleziono (404) - tylko edycja

**Scenariusz**: Próba edycji ćwiczenia, które nie istnieje lub nie należy do użytkowniczki

**Obsługa**:

- Toast notification: "Ćwiczenie nie zostało znalezione"
- Przekierowanie do `/exercises`

**Implementacja**:

```typescript
if (response.status === 404) {
  toast({
    title: "Błąd",
    description: "Ćwiczenie nie zostało znalezione.",
    variant: "destructive",
  });
  router.push("/exercises");
}
```

### 10.4 Błąd autoryzacji (401/403)

**Scenariusz**: Użytkowniczka nie jest zalogowana lub nie ma uprawnień

**Obsługa**:

- Toast notification: "Brak autoryzacji. Zaloguj się ponownie."
- Przekierowanie do strony logowania (lub głównej, w zależności od konfiguracji)

**Implementacja**:

```typescript
if (response.status === 401 || response.status === 403) {
  toast({
    title: "Błąd autoryzacji",
    description: "Brak autoryzacji. Zaloguj się ponownie.",
    variant: "destructive",
  });
  router.push("/login"); // lub odpowiednia ścieżka
}
```

### 10.5 Błąd serwera (500)

**Scenariusz**: Błąd po stronie serwera

**Obsługa**:

- Toast notification: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Formularz pozostaje wypełniony, użytkowniczka może spróbować ponownie

**Implementacja**:

```typescript
if (response.status >= 500) {
  toast({
    title: "Błąd serwera",
    description: "Wystąpił błąd serwera. Spróbuj ponownie później.",
    variant: "destructive",
  });
}
```

### 10.6 Błąd sieci (network error)

**Scenariusz**: Brak połączenia z internetem lub timeout

**Obsługa**:

- Toast notification: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Formularz pozostaje wypełniony, użytkowniczka może spróbować ponownie

**Implementacja**:

```typescript
try {
  const response = await fetch(...);
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    toast({
      title: "Błąd sieci",
      description: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.",
      variant: "destructive",
    });
  }
}
```

### 10.7 Toast notifications

**Komponenty**: Wszystkie Client Components używające `useToast` z shadcn/ui

**Użycie**:

- Sukces zapisu → toast z komunikatem "Ćwiczenie zostało zapisane"
- Błędy API → toast z komunikatem błędu
- Błędy sieci → toast z komunikatem o braku połączenia

**Implementacja**:

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Sukces",
  description: "Ćwiczenie zostało zapisane.",
});
```

**Uwaga**: Jeśli komponent `useToast` nie istnieje, należy go utworzyć zgodnie z dokumentacją shadcn/ui (wymaga komponentu `Toaster` w layout).

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie `src/app/exercises/new/page.tsx` (Server Component - tworzenie)
2. Utworzenie `src/app/exercises/[id]/edit/page.tsx` (Server Component - edycja)
3. Utworzenie katalogu `src/components/exercises/form/` dla komponentów formularza

### Krok 2: Implementacja komponentów pomocniczych

1. Utworzenie `src/components/exercises/form/exercise-form.tsx` (Client Component - główny formularz)
2. Utworzenie `src/components/exercises/form/exercise-form-fields.tsx` (Client Component - pola formularza)
3. Utworzenie `src/components/exercises/form/validation-errors.tsx` (Client Component - błędy walidacji)
4. Utworzenie `src/components/exercises/form/save-button.tsx` (Client Component - przycisk zapisu)
5. Utworzenie `src/components/exercises/form/cancel-button.tsx` (Client Component - przycisk anulowania)

### Krok 3: Implementacja custom hook

1. Utworzenie `src/hooks/use-exercise-form.ts` - hook do zarządzania stanem i logiką formularza
2. Utworzenie `src/hooks/use-before-unload.ts` - hook do potwierdzenia przed opuszczeniem strony

### Krok 4: Implementacja walidacji

1. Utworzenie funkcji pomocniczych do transformacji danych (ViewModel ↔ DTO)
2. Integracja walidacji Zod w `useExerciseForm` hook
3. Implementacja walidacji reguł biznesowych (reps XOR duration, rest_in_between OR rest_after_series)

### Krok 5: Implementacja integracji z API

1. Implementacja wywołań API w `ExerciseForm`:
   - POST `/api/exercises` (tworzenie)
   - PATCH `/api/exercises/[id]` (edycja)
   - GET `/api/exercises/[id]` (pobranie do edycji - w Server Component)
2. Obsługa odpowiedzi API (sukces, błędy)
3. Implementacja toast notifications

### Krok 6: Implementacja Server Components (strony)

1. Implementacja `src/app/exercises/new/page.tsx`:
   - Renderowanie `ExerciseForm` z `mode="create"`
   - Brak `initialData`
2. Implementacja `src/app/exercises/[id]/edit/page.tsx`:
   - Pobranie danych ćwiczenia przez `getExerciseService`
   - Obsługa błędu 404 (przekierowanie do listy)
   - Renderowanie `ExerciseForm` z `mode="edit"` i `initialData`

### Krok 7: Implementacja dostępności (a11y)

1. Dodanie `aria-label` i `aria-describedby` do pól formularza
2. Ustawienie `aria-invalid="true"` dla pól z błędami
3. Implementacja focus management (automatyczne ustawienie focus na pierwsze pole)
4. Dodanie `role` i `aria-live` dla komunikatów błędów

### Krok 8: Implementacja potwierdzenia przed opuszczeniem

1. Implementacja `useBeforeUnload` hook
2. Integracja z `ExerciseForm` (sprawdzanie `hasUnsavedChanges`)
3. Implementacja dialogu potwierdzenia w `CancelButton`

### Krok 9: Styling i responsywność

1. Styling formularza zgodnie z design system (Tailwind CSS)
2. Responsywność (mobile-first)
3. Styling błędów walidacji (czerwone obramowanie, komunikaty)
4. Styling loading state (przycisk zapisu)

### Krok 10: Testowanie

1. Testowanie tworzenia ćwiczenia (happy path)
2. Testowanie edycji ćwiczenia (happy path)
3. Testowanie walidacji (wszystkie reguły biznesowe)
4. Testowanie błędów API (400, 409, 404, 401/403, 500)
5. Testowanie potwierdzenia przed opuszczeniem
6. Testowanie dostępności (screen reader, keyboard navigation)
7. Testowanie responsywności (mobile, tablet, desktop)

### Krok 11: Integracja z istniejącymi komponentami

1. Dodanie linków do formularza z listy ćwiczeń (`/exercises`):
   - Przycisk "Dodaj ćwiczenie" → `/exercises/new`
   - Przycisk "Edytuj" przy każdym ćwiczeniu → `/exercises/[id]/edit`
2. Aktualizacja `AddExerciseButton` (jeśli istnieje) do przekierowania na `/exercises/new`

### Krok 12: Dokumentacja i code review

1. Dodanie komentarzy JSDoc do komponentów i funkcji
2. Weryfikacja zgodności z PRD i user stories (US-010, US-011)
3. Code review i refaktoryzacja (jeśli potrzebna)
