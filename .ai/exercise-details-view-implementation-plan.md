# Plan implementacji widoku Szczegóły ćwiczenia

## 1. Przegląd

Widok szczegółów ćwiczenia (`/exercises/[id]`) to widok wyświetlający pełne informacje o pojedynczym ćwiczeniu z możliwością edycji i usunięcia. Widok jest zaimplementowany jako Sheet (shadcn/ui) wysuwający się z prawej strony na desktopie lub z dołu na urządzeniach mobilnych. Widok wyświetla wszystkie pola ćwiczenia w trybie tylko do odczytu, informacje o powiązaniach ćwiczenia (liczba planów treningowych i sesji używających ćwiczenia), oraz przyciski akcji do edycji i usunięcia. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla fetchowania danych) i Client Components (dla interaktywnych elementów UI i akcji).

## 2. Routing widoku

- **Ścieżka**: `/exercises/[id]`
- **Plik**: `src/app/exercises/[id]/page.tsx`
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla interaktywnych elementów
- **Parametry dynamiczne**: `id` - UUID ćwiczenia

## 3. Struktura komponentów

```
ExerciseDetailsPage (Server Component)
├── Sheet (shadcn/ui) - kontener główny
│   ├── SheetContent
│   │   ├── SheetHeader
│   │   │   ├── SheetTitle
│   │   │   └── SheetDescription (opcjonalnie)
│   │   ├── ExerciseDetails (Server Component)
│   │   │   ├── ExerciseBasicInfo - podstawowe informacje
│   │   │   ├── ExerciseMetrics - metryki (reps/duration, series, rest)
│   │   │   └── ExerciseAdditionalInfo - level, details (jeśli dostępne)
│   │   ├── ExerciseRelationsInfo (Server Component)
│   │   │   ├── PlansCount - liczba planów używających ćwiczenia
│   │   │   └── SessionsCount - liczba sesji z tym ćwiczeniem
│   │   └── ExerciseActions (Client Component)
│   │       ├── EditButton - przycisk edycji
│   │       └── DeleteButton - przycisk usunięcia (z DeleteExerciseDialog)
│   │           └── DeleteExerciseDialog (Client Component)
│   │               ├── DialogTrigger
│   │               ├── DialogContent
│   │               │   ├── DialogHeader
│   │               │   ├── DialogDescription
│   │               │   └── DialogFooter (z przyciskami Anuluj/Potwierdź)
│   └── SheetTrigger (opcjonalnie, jeśli Sheet jest otwierany z zewnątrz)
```

## 4. Szczegóły komponentów

### ExerciseDetailsPage

- **Opis komponentu**: Główny Server Component strony odpowiedzialny za pobranie danych ćwiczenia z API oraz renderowanie struktury widoku w formie Sheet. Komponent obsługuje błędy 404 (ćwiczenie nie znalezione) oraz błędy autoryzacji (401/403).
- **Główne elementy**:
  - Sheet z konfiguracją responsywną (z prawej na desktop, z dołu na mobile)
  - SheetContent z zawartością widoku
  - Obsługa zamknięcia Sheet przez Escape
  - Przekazywanie danych ćwiczenia do komponentów potomnych
- **Obsługiwane interakcje**:
  - Zamknięcie Sheet przez Escape (obsługiwane przez Sheet z shadcn/ui)
  - Przekierowanie do `/exercises` po zamknięciu (opcjonalnie)
- **Obsługiwana walidacja**:
  - Walidacja UUID ćwiczenia z parametru `id`
  - Sprawdzanie czy ćwiczenie istnieje (404 jeśli nie)
  - Sprawdzanie czy ćwiczenie należy do użytkownika (401/403 jeśli nie)
- **Typy**:
  - `ExerciseDTO` - dane ćwiczenia z API
  - `RouteContext` - parametry routingu Next.js
- **Props**: Brak (Server Component, czyta z URL params)

### ExerciseDetails

- **Opis komponentu**: Server Component wyświetlający wszystkie pola ćwiczenia w trybie tylko do odczytu. Komponent organizuje informacje w logiczne sekcje: podstawowe informacje, metryki, oraz dodatkowe informacje.
- **Główne elementy**:
  - Sekcja podstawowych informacji:
    - Tytuł ćwiczenia (`title`)
    - Typ ćwiczenia (`type`: Warm-up | Main Workout | Cool-down) z etykietą po polsku
    - Partia mięśniowa (`part`: Legs | Core | Back | Arms | Chest) z etykietą po polsku
  - Sekcja metryk:
    - Reps (`reps`) LUB Duration (`duration_seconds`) - wyświetlane w zależności od typu ćwiczenia
    - Liczba serii (`series`)
    - Odpoczynek między seriami (`rest_in_between_seconds`)
    - Odpoczynek po seriach (`rest_after_series_seconds`)
  - Sekcja dodatkowych informacji (jeśli dostępne):
    - Poziom (`level`) - opcjonalnie
    - Szczegóły (`details`) - opcjonalnie
- **Obsługiwane interakcje**:
  - Tylko wyświetlanie danych (brak interakcji)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy wszystkie wymagane pola są dostępne
  - Warunkowe wyświetlanie pól opcjonalnych
- **Typy**:
  - `ExerciseDTO` - dane ćwiczenia
- **Props**:
  - `exercise: ExerciseDTO` - dane ćwiczenia do wyświetlenia

### ExerciseRelationsInfo

- **Opis komponentu**: Server Component wyświetlający informacje o powiązaniach ćwiczenia z innymi encjami w systemie. Komponent pobiera dane o liczbie planów treningowych i sesji używających ćwiczenia, aby określić czy ćwiczenie może być usunięte.
- **Główne elementy**:
  - Liczba planów treningowych używających ćwiczenia (z tabeli `workout_plan_exercises`)
  - Liczba sesji treningowych z tym ćwiczeniem (z tabeli `workout_session_exercises`)
  - Komunikat informacyjny o powiązaniach (jeśli istnieją)
- **Obsługiwane interakcje**:
  - Tylko wyświetlanie danych (brak interakcji)
- **Obsługiwana walidacja**:
  - Sprawdzanie czy ćwiczenie ma powiązania (dla logiki blokady usunięcia)
- **Typy**:
  - `ExerciseRelationsData` - nowy typ ViewModel zawierający:
    - `plansCount: number` - liczba planów używających ćwiczenia
    - `sessionsCount: number` - liczba sesji z tym ćwiczeniem
    - `hasRelations: boolean` - flaga czy ćwiczenie ma jakiekolwiek powiązania
- **Props**:
  - `exerciseId: string` - UUID ćwiczenia
  - `userId: string` - UUID użytkownika

### ExerciseActions

- **Opis komponentu**: Client Component zawierający przyciski akcji dla ćwiczenia: edycja i usunięcie. Komponent zarządza stanem dialogu usunięcia oraz wywołuje odpowiednie akcje API.
- **Główne elementy**:
  - Przycisk "Edytuj" - nawigacja do `/exercises/[id]/edit`
  - Przycisk "Usuń" - otwiera dialog potwierdzenia usunięcia
    - Przycisk disabled z tooltipem, jeśli ćwiczenie ma powiązania
    - Tooltip z komunikatem: "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
- **Obsługiwane interakcje**:
  - Kliknięcie "Edytuj" → nawigacja do formularza edycji
  - Kliknięcie "Usuń" → otwarcie dialogu potwierdzenia
  - Obsługa stanu dialogu (open/closed)
  - Wywołanie DELETE API po potwierdzeniu
  - Przekierowanie do `/exercises` po udanym usunięciu
  - Toast notification po udanym usunięciu
- **Obsługiwana walidacja**:
  - Sprawdzanie czy ćwiczenie ma powiązania (dla disabled przycisku "Usuń")
  - Walidacja odpowiedzi API (409 jeśli są powiązania)
- **Typy**:
  - `ExerciseActionsProps` - interfejs komponentu:
    - `exerciseId: string` - UUID ćwiczenia
    - `hasRelations: boolean` - flaga czy ćwiczenie ma powiązania
- **Props**:
  - `exerciseId: string` - UUID ćwiczenia
  - `hasRelations: boolean` - flaga czy ćwiczenie ma powiązania

### DeleteExerciseDialog

- **Opis komponentu**: Client Component zawierający dialog potwierdzenia usunięcia ćwiczenia. Dialog wyświetla ostrzeżenie przed usunięciem oraz przyciski anulowania i potwierdzenia.
- **Główne elementy**:
  - Dialog (shadcn/ui) z overlay
  - DialogContent z:
    - DialogHeader z tytułem: "Usuń ćwiczenie"
    - DialogDescription z komunikatem: "Czy na pewno chcesz usunąć to ćwiczenie? Tej operacji nie można cofnąć."
    - DialogFooter z przyciskami:
      - "Anuluj" - zamyka dialog
      - "Usuń" (variant="destructive") - potwierdza usunięcie
- **Obsługiwane interakcje**:
  - Kliknięcie "Anuluj" → zamknięcie dialogu
  - Kliknięcie "Usuń" → wywołanie DELETE API
  - Zamknięcie dialogu przez Escape lub kliknięcie overlay
  - Obsługa stanu ładowania podczas usuwania (disabled przyciski)
  - Toast notification po udanym usunięciu
  - Przekierowanie do `/exercises` po udanym usunięciu
- **Obsługiwana walidacja**:
  - Sprawdzanie odpowiedzi API (409 jeśli są powiązania)
  - Obsługa błędów sieciowych
- **Typy**:
  - `DeleteExerciseDialogProps` - interfejs komponentu:
    - `exerciseId: string` - UUID ćwiczenia
    - `exerciseTitle: string` - tytuł ćwiczenia (dla komunikatu)
    - `open: boolean` - stan otwarcia dialogu
    - `onOpenChange: (open: boolean) => void` - callback zmiany stanu
- **Props**:
  - `exerciseId: string` - UUID ćwiczenia
  - `exerciseTitle: string` - tytuł ćwiczenia
  - `open: boolean` - stan otwarcia dialogu
  - `onOpenChange: (open: boolean) => void` - callback zmiany stanu

## 5. Typy

### Typy istniejące (z `src/types.ts`)

- `ExerciseDTO`: Typ DTO ćwiczenia z API

  ```typescript
  type ExerciseDTO = Omit<ExerciseEntity, "user_id" | "title_normalized">;
  ```

  - Zawiera wszystkie pola ćwiczenia: `id`, `title`, `type`, `part`, `level`, `details`, `reps`, `duration_seconds`, `series`, `rest_in_between_seconds`, `rest_after_series_seconds`, `created_at`, `updated_at`

- `ExercisePart`: Enum części ciała

  ```typescript
  type ExercisePart = "Legs" | "Core" | "Back" | "Arms" | "Chest";
  ```

- `ExerciseType`: Enum typu ćwiczenia
  ```typescript
  type ExerciseType = "Warm-up" | "Main Workout" | "Cool-down";
  ```

### Typy nowe (ViewModel dla widoku)

- `ExerciseRelationsData`: Typ ViewModel dla informacji o powiązaniach ćwiczenia

  ```typescript
  type ExerciseRelationsData = {
    plansCount: number; // Liczba planów treningowych używających ćwiczenia
    sessionsCount: number; // Liczba sesji treningowych z tym ćwiczeniem
    hasRelations: boolean; // Flaga czy ćwiczenie ma jakiekolwiek powiązania
  };
  ```

  - Używany przez komponent `ExerciseRelationsInfo`
  - Obliczany na podstawie zapytań do tabel `workout_plan_exercises` i `workout_session_exercises`

- `ExerciseDetailsViewModel`: Typ ViewModel dla danych wyświetlanych w widoku (opcjonalnie, jeśli potrzebne dodatkowe transformacje)
  ```typescript
  type ExerciseDetailsViewModel = ExerciseDTO & {
    relations?: ExerciseRelationsData; // Opcjonalne dane o powiązaniach
  };
  ```

### Etykiety i mapowania

- `partLabels`: Mapowanie `ExercisePart` na etykiety po polsku

  ```typescript
  const partLabels: Record<ExercisePart, string> = {
    Legs: "Nogi",
    Core: "Brzuch",
    Back: "Plecy",
    Arms: "Ręce",
    Chest: "Klatka",
  };
  ```

- `typeLabels`: Mapowanie `ExerciseType` na etykiety po polsku
  ```typescript
  const typeLabels: Record<ExerciseType, string> = {
    "Warm-up": "Rozgrzewka",
    "Main Workout": "Główny trening",
    "Cool-down": "Schłodzenie",
  };
  ```

## 6. Zarządzanie stanem

### Stan lokalny w Client Components

- **ExerciseActions**:

  - `isDeleteDialogOpen: boolean` - stan otwarcia dialogu usunięcia
  - Zarządzany przez `useState<boolean>`

- **DeleteExerciseDialog**:
  - `isDeleting: boolean` - stan ładowania podczas usuwania
  - Zarządzany przez `useState<boolean>`

### Custom hook (opcjonalnie)

- `useDeleteExercise`: Hook do obsługi usuwania ćwiczenia
  ```typescript
  function useDeleteExercise() {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const deleteExercise = async (exerciseId: string) => {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/exercises/${exerciseId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          if (response.status === 409) {
            toast.error(
              "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
            );
          } else {
            toast.error("Nie udało się usunąć ćwiczenia");
          }
          return;
        }

        toast.success("Ćwiczenie zostało usunięte");
        router.push("/exercises");
      } catch (error) {
        toast.error("Wystąpił błąd podczas usuwania ćwiczenia");
      } finally {
        setIsDeleting(false);
      }
    };

    return { deleteExercise, isDeleting };
  }
  ```

### Brak globalnego stanu

- Widok nie wymaga globalnego stanu (Zustand)
- Wszystkie dane są pobierane przez Server Components
- Stan lokalny wystarcza dla interaktywnych elementów UI

## 7. Integracja API

### GET /api/exercises/[id]

- **Cel**: Pobranie danych ćwiczenia
- **Typ żądania**: `GET`
- **URL**: `/api/exercises/{id}`
- **Parametry**: `id` - UUID ćwiczenia w ścieżce URL
- **Typ odpowiedzi**: `ExerciseDTO`
- **Kody sukcesu**: `200`
- **Kody błędów**:
  - `400` - Brak identyfikatora ćwiczenia w ścieżce
  - `404` - Ćwiczenie nie zostało znalezione lub nie należy do użytkownika
  - `401/403` - Brak autoryzacji
  - `500` - Błąd serwera
- **Użycie**: Wywoływane przez Server Component `ExerciseDetailsPage` podczas renderowania

### DELETE /api/exercises/[id]

- **Cel**: Usunięcie ćwiczenia
- **Typ żądania**: `DELETE`
- **URL**: `/api/exercises/{id}`
- **Parametry**: `id` - UUID ćwiczenia w ścieżce URL
- **Typ odpowiedzi**: Brak body (status `204`)
- **Kody sukcesu**: `204`
- **Kody błędów**:
  - `400` - Brak identyfikatora ćwiczenia w ścieżce
  - `404` - Ćwiczenie nie zostało znalezione lub nie należy do użytkownika
  - `409` - Ćwiczenie ma powiązania (używane w sesjach/PR/planach) - FK RESTRICT
  - `401/403` - Brak autoryzacji
  - `500` - Błąd serwera
- **Użycie**: Wywoływane przez Client Component `DeleteExerciseDialog` po potwierdzeniu usunięcia

### Pobieranie informacji o powiązaniach

- **Cel**: Sprawdzenie czy ćwiczenie ma powiązania z innymi encjami
- **Implementacja**: Bezpośrednie zapytania do bazy danych przez Server Component
- **Zapytania**:
  - Liczba planów: `SELECT COUNT(*) FROM workout_plan_exercises WHERE exercise_id = $1`
  - Liczba sesji: `SELECT COUNT(*) FROM workout_session_exercises WHERE exercise_id = $1`
- **Typ odpowiedzi**: `ExerciseRelationsData`
- **Użycie**: Wywoływane przez Server Component `ExerciseRelationsInfo` podczas renderowania

## 8. Interakcje użytkownika

### 8.1 Otwarcie widoku szczegółów

- **Akcja**: Kliknięcie karty ćwiczenia na liście (`ExerciseCard`)
- **Rezultat**: Nawigacja do `/exercises/[id]` z otwarciem Sheet
- **Implementacja**: Link w `ExerciseCard` prowadzi do `/exercises/[id]`

### 8.2 Zamknięcie Sheet

- **Akcja**: Kliknięcie przycisku zamknięcia, Escape, lub kliknięcie overlay
- **Rezultat**: Zamknięcie Sheet i powrót do poprzedniej strony (lub `/exercises`)
- **Implementacja**: Obsługiwane przez komponent Sheet z shadcn/ui

### 8.3 Edycja ćwiczenia

- **Akcja**: Kliknięcie przycisku "Edytuj"
- **Rezultat**: Nawigacja do `/exercises/[id]/edit`
- **Implementacja**: `router.push(`/exercises/${exerciseId}/edit`)` w `ExerciseActions`

### 8.4 Otwarcie dialogu usunięcia

- **Akcja**: Kliknięcie przycisku "Usuń"
- **Rezultat**: Otwarcie dialogu potwierdzenia usunięcia
- **Warunki**: Przycisk "Usuń" jest disabled z tooltipem, jeśli `hasRelations === true`
- **Implementacja**: `setIsDeleteDialogOpen(true)` w `ExerciseActions`

### 8.5 Potwierdzenie usunięcia

- **Akcja**: Kliknięcie przycisku "Usuń" w dialogu
- **Rezultat**:
  - Wywołanie DELETE API
  - Toast notification: "Ćwiczenie zostało usunięte" (sukces) lub komunikat błędu
  - Przekierowanie do `/exercises` po udanym usunięciu
- **Implementacja**: Wywołanie `deleteExercise(exerciseId)` w `DeleteExerciseDialog`

### 8.6 Anulowanie usunięcia

- **Akcja**: Kliknięcie przycisku "Anuluj" w dialogu lub Escape
- **Rezultat**: Zamknięcie dialogu bez usuwania ćwiczenia
- **Implementacja**: `setIsDeleteDialogOpen(false)` w `ExerciseActions`

## 9. Warunki i walidacja

### 9.1 Walidacja UUID ćwiczenia

- **Warunek**: Parametr `id` w URL musi być poprawnym UUID
- **Komponent**: `ExerciseDetailsPage` (Server Component)
- **Walidacja**: Sprawdzanie formatu UUID przed wywołaniem API
- **Obsługa**: Jeśli UUID jest nieprawidłowy, zwróć błąd 400 lub przekieruj do `/exercises`

### 9.2 Sprawdzanie istnienia ćwiczenia

- **Warunek**: Ćwiczenie musi istnieć w bazie danych
- **Komponent**: `ExerciseDetailsPage` (Server Component)
- **Walidacja**: API zwraca 404 jeśli ćwiczenie nie istnieje
- **Obsługa**: Wyświetlenie komunikatu błędu 404 lub przekierowanie do `/exercises` z toast notification

### 9.3 Sprawdzanie własności ćwiczenia

- **Warunek**: Ćwiczenie musi należeć do zalogowanego użytkownika
- **Komponent**: `ExerciseDetailsPage` (Server Component)
- **Walidacja**: API zwraca 401/403 jeśli ćwiczenie nie należy do użytkownika
- **Obsługa**: Wyświetlenie komunikatu błędu autoryzacji lub przekierowanie do logowania

### 9.4 Sprawdzanie powiązań ćwiczenia

- **Warunek**: Ćwiczenie nie może być usunięte, jeśli ma powiązania z sesjami/PR/planami
- **Komponent**: `ExerciseRelationsInfo` (Server Component), `ExerciseActions` (Client Component)
- **Walidacja**:
  - Server Component: Pobranie liczby planów i sesji używających ćwiczenia
  - Client Component: Przycisk "Usuń" disabled jeśli `hasRelations === true`
- **Obsługa**:
  - Tooltip na przycisku "Usuń": "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
  - API zwraca 409 przy próbie usunięcia ćwiczenia z powiązaniami
  - Toast notification: "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"

### 9.5 Walidacja odpowiedzi API przy usuwaniu

- **Warunek**: Sprawdzanie kodu odpowiedzi API po DELETE
- **Komponent**: `DeleteExerciseDialog` (Client Component)
- **Walidacja**:
  - `204` - sukces, przekierowanie do `/exercises`
  - `409` - konflikt (powiązania), toast z komunikatem błędu
  - `404` - nie znalezione, toast z komunikatem błędu
  - `401/403` - brak autoryzacji, toast z komunikatem błędu
  - `500` - błąd serwera, toast z komunikatem błędu
- **Obsługa**: Toast notifications dla wszystkich kodów błędów

## 10. Obsługa błędów

### 10.1 Błąd 404 - Ćwiczenie nie znalezione

- **Scenariusz**: Ćwiczenie o podanym ID nie istnieje lub nie należy do użytkownika
- **Obsługa**:
  - Przekierowanie do `/exercises` z toast notification: "Ćwiczenie nie zostało znalezione"
  - Alternatywnie: Wyświetlenie komunikatu błędu w widoku z przyciskiem powrotu
- **Implementacja**:
  ```typescript
  if (response.status === 404) {
    toast.error("Ćwiczenie nie zostało znalezione");
    router.push("/exercises");
  }
  ```

### 10.2 Błąd 401/403 - Brak autoryzacji

- **Scenariusz**: Użytkownik nie jest zalogowany lub ćwiczenie nie należy do użytkownika
- **Obsługa**:
  - Przekierowanie do logowania (401) lub wyświetlenie komunikatu błędu (403)
  - Toast notification: "Brak autoryzacji. Zaloguj się ponownie."
- **Implementacja**:
  ```typescript
  if (response.status === 401 || response.status === 403) {
    toast.error("Brak autoryzacji. Zaloguj się ponownie.");
    router.push("/login");
  }
  ```

### 10.3 Błąd 409 - Konflikt (powiązania)

- **Scenariusz**: Próba usunięcia ćwiczenia, które ma powiązania z sesjami/PR/planami
- **Obsługa**:
  - Toast notification: "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
  - Dialog pozostaje otwarty, użytkowniczka może go zamknąć
- **Implementacja**:
  ```typescript
  if (response.status === 409) {
    toast.error(
      "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
    );
    // Dialog pozostaje otwarty
  }
  ```

### 10.4 Błąd 500 - Błąd serwera

- **Scenariusz**: Nieoczekiwany błąd serwera podczas operacji
- **Obsługa**:
  - Toast notification: "Wystąpił błąd serwera. Spróbuj ponownie później."
  - Dialog pozostaje otwarty, użytkowniczka może spróbować ponownie
- **Implementacja**:
  ```typescript
  if (response.status >= 500) {
    toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
  }
  ```

### 10.5 Błąd sieci (network error)

- **Scenariusz**: Brak połączenia z internetem lub timeout
- **Obsługa**:
  - Toast notification: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
  - Dialog pozostaje otwarty, użytkowniczka może spróbować ponownie
- **Implementacja**:
  ```typescript
  try {
    const response = await fetch(...);
  } catch (error) {
    if (error instanceof TypeError) {
      toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
    }
  }
  ```

### 10.6 Toast notifications

- **Komponenty**: Wszystkie Client Components używające `toast` z `sonner`
- **Użycie**:
  - Sukces usunięcia → toast: "Ćwiczenie zostało usunięte"
  - Błędy API → toast z odpowiednim komunikatem błędu
  - Błędy sieci → toast z komunikatem o braku połączenia
- **Implementacja**:

  ```typescript
  import { toast } from "sonner";

  toast.success("Ćwiczenie zostało usunięte");
  toast.error(
    "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
  );
  ```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie `src/app/exercises/[id]/page.tsx` (Server Component - główny page)
2. Utworzenie `src/app/exercises/[id]/loading.tsx` (Loading state z SkeletonLoader)
3. Utworzenie `src/app/exercises/[id]/error.tsx` (Error Boundary)
4. Utworzenie katalogu `src/components/exercises/details/` dla komponentów widoku szczegółów

### Krok 2: Instalacja komponentu Sheet z shadcn/ui

1. Sprawdzenie czy komponent Sheet jest zainstalowany: `src/components/ui/sheet.tsx`
2. Jeśli nie, instalacja: `npx shadcn@latest add sheet`
3. Sprawdzenie czy komponent Dialog jest zainstalowany (dla DeleteExerciseDialog): `src/components/ui/dialog.tsx`
4. Jeśli nie, instalacja: `npx shadcn@latest add dialog`
5. Sprawdzenie czy komponent Tooltip jest zainstalowany (dla tooltipu na przycisku Usuń): `src/components/ui/tooltip.tsx`
6. Jeśli nie, instalacja: `npx shadcn@latest add tooltip`

### Krok 3: Implementacja głównego komponentu strony

1. Utworzenie `src/app/exercises/[id]/page.tsx`:
   - Server Component pobierający dane ćwiczenia przez `getExerciseService`
   - Renderowanie Sheet z konfiguracją responsywną
   - Obsługa błędów 404, 401/403
   - Przekazywanie danych do komponentów potomnych

### Krok 4: Implementacja komponentu ExerciseDetails

1. Utworzenie `src/components/exercises/details/exercise-details.tsx`:
   - Server Component wyświetlający wszystkie pola ćwiczenia
   - Sekcje: podstawowe informacje, metryki, dodatkowe informacje
   - Mapowanie enumów na etykiety po polsku
   - Warunkowe wyświetlanie pól opcjonalnych

### Krok 5: Implementacja komponentu ExerciseRelationsInfo

1. Utworzenie `src/components/exercises/details/exercise-relations-info.tsx`:
   - Server Component pobierający dane o powiązaniach
   - Funkcja pomocnicza do pobierania liczby planów i sesji
   - Wyświetlanie informacji o powiązaniach
   - Obliczanie flagi `hasRelations`

### Krok 6: Implementacja funkcji pomocniczej do pobierania powiązań

1. Utworzenie `src/repositories/exercises.ts` (dodanie funkcji):
   - `getExerciseRelations(client, userId, exerciseId)`: Funkcja pobierająca liczbę planów i sesji
   - Zwraca `ExerciseRelationsData`

### Krok 7: Implementacja komponentu ExerciseActions

1. Utworzenie `src/components/exercises/details/exercise-actions.tsx`:
   - Client Component z przyciskami "Edytuj" i "Usuń"
   - Zarządzanie stanem dialogu usunięcia
   - Przycisk "Usuń" disabled z tooltipem jeśli `hasRelations === true`
   - Nawigacja do formularza edycji

### Krok 8: Implementacja komponentu DeleteExerciseDialog

1. Utworzenie `src/components/exercises/details/delete-exercise-dialog.tsx`:
   - Client Component z dialogiem potwierdzenia
   - Zarządzanie stanem ładowania podczas usuwania
   - Wywołanie DELETE API po potwierdzeniu
   - Obsługa wszystkich kodów błędów
   - Toast notifications
   - Przekierowanie do `/exercises` po udanym usunięciu

### Krok 9: Implementacja custom hook useDeleteExercise (opcjonalnie)

1. Utworzenie `src/hooks/use-delete-exercise.ts`:
   - Hook do obsługi usuwania ćwiczenia
   - Zarządzanie stanem ładowania
   - Obsługa błędów i toast notifications
   - Przekierowanie po udanym usunięciu

### Krok 10: Implementacja loading state

1. Utworzenie `src/app/exercises/[id]/loading.tsx`:
   - SkeletonLoader dla Sheet
   - SkeletonLoader dla pól ćwiczenia
   - SkeletonLoader dla przycisków akcji

### Krok 11: Implementacja error boundary

1. Utworzenie `src/app/exercises/[id]/error.tsx`:
   - Error Boundary dla błędów renderowania
   - Komunikat błędu z przyciskiem powrotu do `/exercises`
   - Obsługa błędów 404, 401/403

### Krok 12: Testowanie widoku

1. Testowanie otwarcia widoku z listy ćwiczeń
2. Testowanie wyświetlania wszystkich pól ćwiczenia
3. Testowanie wyświetlania informacji o powiązaniach
4. Testowanie przycisku "Edytuj" (nawigacja)
5. Testowanie przycisku "Usuń" (disabled z tooltipem gdy są powiązania)
6. Testowanie dialogu usunięcia (otwarcie, anulowanie, potwierdzenie)
7. Testowanie obsługi błędów (404, 409, 500, network error)
8. Testowanie toast notifications
9. Testowanie responsywności (desktop/mobile)
10. Testowanie dostępności (ARIA labels, keyboard navigation)

### Krok 13: Integracja z formularzem edycji

1. Sprawdzenie czy istnieje widok edycji: `src/app/exercises/[id]/edit/page.tsx`
2. Jeśli nie, utworzenie widoku edycji zgodnie z planem formularza ćwiczenia
3. Weryfikacja nawigacji z przycisku "Edytuj"

### Krok 14: Finalizacja i optymalizacja

1. Sprawdzenie dostępności (ARIA labels, keyboard shortcuts)
2. Optymalizacja wydajności (lazy loading, memoization jeśli potrzebne)
3. Sprawdzenie responsywności na różnych urządzeniach
4. Weryfikacja zgodności z PRD i user stories (US-013, US-014, US-015, US-017)
5. Code review i refaktoryzacja jeśli potrzebne
