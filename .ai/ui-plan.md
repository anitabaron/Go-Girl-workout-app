# Architektura UI dla Go Girl Workout App

## 1. Przegląd struktury UI

Go Girl to aplikacja webowa zaprojektowana z myślą o mobile-first, przeznaczona dla kobiet trenujących kalistenikę i trening siłowy. Architektura UI opiera się na Next.js 16 App Router z podziałem na Server Components (dla list i danych statycznych) oraz Client Components (dla interaktywnych formularzy i asystenta treningowego).

Główna struktura aplikacji składa się z:

- **Widoków autoryzacji** (logowanie, rejestracja, reset hasła)
- **Głównej nawigacji** z sekcjami: Biblioteka ćwiczeń, Plany treningowe, Historia sesji, Rekordy (PR)
- **Asystenta treningowego** jako pełnoekranowego widoku z dużymi kontrolkami
- **Widoków CRUD** dla ćwiczeń i planów treningowych
- **Widoków przeglądowych** dla historii sesji i rekordów

Aplikacja wykorzystuje shadcn/ui jako bazę systemu komponentów, zapewniając dostępność i spójność wizualną. Priorytetem jest prostota użycia podczas treningu, z dużymi przyciskami i czytelnym interfejsem dostosowanym do użycia jedną ręką.

## 2. Lista widoków

### 2.1 Widoki autoryzacji

#### 2.1.1 Widok logowania (`/login`)

- **Ścieżka**: `/login`
- **Główny cel**: Umożliwienie zalogowania użytkowniczki do aplikacji
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami: email, password
  - Link do resetu hasła
  - Link do rejestracji (jeśli użytkowniczka nie ma konta)
- **Kluczowe komponenty widoku**:
  - Formularz logowania (Client Component z walidacją Zod)
  - Input email (z walidacją formatu)
  - Input password (z możliwością pokazania/ukrycia hasła)
  - Button "Zaloguj się"
  - Link "Nie pamiętasz hasła?"
  - Link "Zarejestruj się"
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja po stronie klienta (Zod) przed wysłaniem żądania
  - Komunikaty błędów inline przy polach (np. "Nieprawidłowy email" lub "Nieprawidłowe hasło")
  - Toast notification dla błędów autoryzacji z serwera
  - Przekierowanie do `/` po udanym logowaniu
  - Middleware chroni przed dostępem do chronionych route'ów bez autoryzacji
  - ARIA labels dla wszystkich pól formularza
  - Focus management: automatyczne ustawienie focus na pierwsze pole przy załadowaniu

#### 2.1.2 Widok rejestracji (`/register`)

- **Ścieżka**: `/register`
- **Główny cel**: Utworzenie nowego konta użytkowniczki
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami: email, password, confirm password
  - Informacja o wymaganiach dotyczących hasła (min. długość, znaki specjalne - zgodnie z konfiguracją Supabase)
  - Link do logowania (jeśli użytkowniczka już ma konto)
- **Kluczowe komponenty widoku**:
  - Formularz rejestracji (Client Component)
  - Input email
  - Input password z wskaźnikiem siły hasła
  - Input confirm password z walidacją zgodności
  - Button "Zarejestruj się"
  - Link "Masz już konto? Zaloguj się"
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja hasła po stronie klienta (zgodność z wymaganiami Supabase)
  - Walidacja zgodności haseł (confirm password musi być identyczne)
  - Komunikaty błędów inline
  - Toast notification po udanej rejestracji z prośbą o potwierdzenie emaila (jeśli wymagane przez Supabase)
  - Przekierowanie do logowania lub automatyczne logowanie po rejestracji (zależnie od konfiguracji)
  - ARIA labels i instrukcje dla screen readerów

#### 2.1.3 Widok resetu hasła (`/reset-password`)

- **Ścieżka**: `/reset-password`
- **Główny cel**: Umożliwienie zresetowania zapomnianego hasła
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polem email
  - Instrukcja: "Wprowadź adres email, a wyślemy Ci link do resetu hasła"
  - Link do logowania
- **Kluczowe komponenty widoku**:
  - Formularz resetu hasła (Client Component)
  - Input email
  - Button "Wyślij link resetujący"
  - Link "Wróć do logowania"
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja formatu email
  - Toast notification po wysłaniu linku: "Sprawdź swoją skrzynkę email"
  - Zabezpieczenie przed spamem (rate limiting po stronie Supabase)
  - Komunikaty błędów inline
  - ARIA labels

### 2.2 Główna nawigacja i layout

#### 2.2.1 Layout główny (`/`)

- **Ścieżka**: `/` (root layout)
- **Główny cel**: Zapewnienie spójnej struktury nawigacji i layoutu dla wszystkich widoków aplikacji
- **Kluczowe informacje do wyświetlenia**:
  - Nawigacja główna (mobile: bottom navigation, desktop: top bar/sidebar)
  - Wyróżniony przycisk "Start treningu"
  - Menu użytkowniczki (wylogowanie, ustawienia - jeśli w zakresie)
- **Kluczowe komponenty widoku**:
  - `MainLayout` (Server Component) - wrapper dla wszystkich widoków
  - `BottomNavigation` (Client Component) - dla mobile (< 768px)
  - `TopNavigation` (Client Component) - dla desktop (≥ 768px)
  - `QuickStartButton` (Client Component) - przycisk szybkiego startu sesji
  - `UserMenu` (Client Component) - dropdown z opcjami użytkowniczki
- **UX, dostępność i względy bezpieczeństwa**:
  - Responsywna nawigacja: bottom navigation na mobile, top bar na desktop
  - Aktywna sekcja wizualnie wyróżniona
  - Przycisk "Start treningu" zawsze widoczny i łatwo dostępny
  - Keyboard navigation dla wszystkich elementów nawigacji
  - ARIA labels dla ikon nawigacji
  - Middleware sprawdza autoryzację przed renderowaniem layoutu

### 2.3 Biblioteka ćwiczeń

#### 2.3.1 Lista ćwiczeń (`/exercises`)

- **Ścieżka**: `/exercises`
- **Główny cel**: Wyświetlenie wszystkich ćwiczeń użytkowniczki z możliwością przeglądania, filtrowania i sortowania
- **Kluczowe informacje do wyświetlenia**:
  - Lista ćwiczeń z kolumnami: title, type, part, level (jeśli dostępny)
  - Filtry: part (dropdown), type (dropdown), level (dropdown)
  - Sortowanie: created_at (domyślnie desc), title, part, type
  - Paginacja: "Load more" (limit=20, max=100)
  - Pusty stan z CTA "Dodaj pierwsze ćwiczenie"
  - Przycisk "Dodaj ćwiczenie" (FAB lub w górnym pasku)
- **Kluczowe komponenty widoku**:
  - `ExercisesList` (Server Component) - lista ćwiczeń z fetchowaniem danych
  - `ExerciseCard` (Server Component) - karta pojedynczego ćwiczenia
  - `ExerciseFilters` (Client Component) - dropdowny filtrowania
  - `ExerciseSort` (Client Component) - dropdown sortowania
  - `EmptyState` (Client Component) - pusty stan z ikoną i CTA
  - `AddExerciseButton` (Client Component) - przycisk dodawania
- **UX, dostępność i względy bezpieczeństwa**:
  - Skeleton loaders podczas ładowania listy
  - Filtry i sortowanie działają przez query params (URL state)
  - Optymistyczne aktualizacje przy usuwaniu ćwiczenia (z rollbackiem przy błędzie)
  - Toast notifications dla operacji CRUD
  - Komunikaty błędów z API wyświetlane jako toast
  - Keyboard navigation dla listy (arrow keys)
  - ARIA labels dla wszystkich interaktywnych elementów
  - RLS zapewnia, że widoczne są tylko ćwiczenia użytkowniczki

#### 2.3.2 Formularz tworzenia/edycji ćwiczenia (`/exercises/new`, `/exercises/[id]/edit`)

- **Ścieżka**: `/exercises/new` (tworzenie), `/exercises/[id]/edit` (edycja)
- **Główny cel**: Utworzenie lub edycja ćwiczenia z pełną walidacją
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami:
    - title (required, z walidacją unikalności)
    - type (enum: Warm-up | Main Workout | Cool-down, required)
    - part (enum: Legs | Core | Back | Arms | Chest, required)
    - level (opcjonalny)
    - details (opcjonalny, textarea)
    - reps (opcjonalny, jeśli duration nie jest ustawiony)
    - duration_seconds (opcjonalny, jeśli reps nie jest ustawiony)
    - series (required, > 0)
    - rest_in_between_seconds (opcjonalny, jeśli rest_after_series nie jest ustawiony)
    - rest_after_series_seconds (opcjonalny, jeśli rest_in_between nie jest ustawiony)
  - Walidacja: co najmniej jedno z reps/duration, co najmniej jedno z rest_in_between/rest_after_series
  - Komunikaty błędów inline przy polach
  - Przyciski: "Zapisz", "Anuluj"
- **Kluczowe komponenty widoku**:
  - `ExerciseForm` (Client Component) - główny formularz
  - `ExerciseFormFields` (Client Component) - pola formularza z walidacją
  - `ValidationErrors` (Client Component) - wyświetlanie błędów walidacji
  - `SaveButton` (Client Component) - przycisk zapisu z loading state
  - `CancelButton` (Client Component) - przycisk anulowania z potwierdzeniem (jeśli są niezapisane zmiany)
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja po stronie klienta (Zod) przed wysłaniem
  - Walidacja po stronie serwera (odpowiedzi API)
  - Komunikaty błędów inline przy polach z konkretnymi informacjami
  - Specyficzny komunikat dla błędu 409 (duplikat tytułu): "Ćwiczenie o tej nazwie już istnieje"
  - Toast notification przy udanym zapisie
  - Przekierowanie do listy ćwiczeń po zapisie
  - Potwierdzenie przed opuszczeniem strony z niezapisanymi zmianami
  - ARIA labels i aria-invalid dla pól z błędami
  - Focus management: automatyczne ustawienie focus na pierwsze pole przy załadowaniu

#### 2.3.3 Widok szczegółów ćwiczenia (`/exercises/[id]`)

- **Ścieżka**: `/exercises/[id]`
- **Główny cel**: Wyświetlenie szczegółów ćwiczenia z możliwością edycji i usunięcia
- **Kluczowe informacje do wyświetlenia**:
  - Wszystkie pola ćwiczenia (tylko do odczytu)
  - Informacja o powiązaniach (liczba planów używających ćwiczenia, liczba sesji z tym ćwiczeniem)
  - Przyciski akcji: "Edytuj", "Usuń"
  - Komunikat blokady usunięcia (jeśli ćwiczenie ma powiązania)
- **Kluczowe komponenty widoku**:
  - `ExerciseDetails` (Server Component) - szczegóły ćwiczenia
  - `ExerciseActions` (Client Component) - przyciski akcji
  - `DeleteExerciseDialog` (Client Component) - dialog potwierdzenia usunięcia
  - `ExerciseRelationsInfo` (Server Component) - informacja o powiązaniach
- **UX, dostępność i względy bezpieczeństwa**:
  - Sheet (shadcn/ui) wysuwający się z prawej (desktop) lub z dołu (mobile)
  - Przycisk "Usuń" disabled z tooltipem, jeśli ćwiczenie ma powiązania
  - Dialog potwierdzenia przed usunięciem
  - Toast notification po udanym usunięciu
  - Komunikat błędu 409: "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
  - ARIA labels dla wszystkich akcji
  - Keyboard shortcuts: Escape zamyka Sheet

### 2.4 Plany treningowe

#### 2.4.1 Lista planów treningowych (`/workout-plans`)

- **Ścieżka**: `/workout-plans`
- **Główny cel**: Wyświetlenie wszystkich planów treningowych użytkowniczki
- **Kluczowe informacje do wyświetlenia**:
  - Lista planów z kolumnami: name, part, liczba ćwiczeń, data utworzenia
  - Filtry: part (dropdown)
  - Sortowanie: created_at (domyślnie desc), name
  - Paginacja: "Load more"
  - Pusty stan z CTA "Utwórz pierwszy plan"
  - Przycisk "Utwórz plan" (FAB lub w górnym pasku)
- **Kluczowe komponenty widoku**:
  - `WorkoutPlansList` (Server Component) - lista planów
  - `WorkoutPlanCard` (Server Component) - karta planu
  - `WorkoutPlanFilters` (Client Component) - filtry
  - `WorkoutPlanSort` (Client Component) - sortowanie
  - `EmptyState` (Client Component) - pusty stan
  - `CreatePlanButton` (Client Component) - przycisk tworzenia
- **UX, dostępność i względy bezpieczeństwa**:
  - Skeleton loaders podczas ładowania
  - Filtry i sortowanie przez query params
  - Optymistyczne aktualizacje przy usuwaniu
  - Toast notifications dla operacji CRUD
  - Keyboard navigation
  - ARIA labels
  - RLS zapewnia izolację danych

#### 2.4.2 Formularz tworzenia/edycji planu (`/workout-plans/new`, `/workout-plans/[id]/edit`)

- **Ścieżka**: `/workout-plans/new` (tworzenie), `/workout-plans/[id]/edit` (edycja)
- **Główny cel**: Utworzenie lub edycja planu treningowego z listą ćwiczeń w kolejności
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami:
    - name (required)
    - description (opcjonalny, textarea)
    - part (opcjonalny, enum: Legs | Core | Back | Arms | Chest)
  - Lista ćwiczeń w planie (w kolejności dodania):
    - Dla każdego ćwiczenia: nazwa, type, part
    - Parametry planned\_\*: planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds
    - Przycisk usunięcia ćwiczenia z planu
  - Przycisk "Dodaj ćwiczenie" (otwiera dialog z listą dostępnych ćwiczeń)
  - Walidacja: co najmniej jedno ćwiczenie w planie
  - Przyciski: "Zapisz", "Anuluj"
- **Kluczowe komponenty widoku**:
  - `WorkoutPlanForm` (Client Component) - główny formularz
  - `WorkoutPlanMetadataFields` (Client Component) - pola metadanych planu
  - `WorkoutPlanExercisesList` (Client Component) - lista ćwiczeń w planie
  - `WorkoutPlanExerciseItem` (Client Component) - pojedyncze ćwiczenie w planie z parametrami
  - `AddExerciseDialog` (Client Component) - dialog wyboru ćwiczenia do dodania
  - `ExerciseSelector` (Client Component) - lista dostępnych ćwiczeń do wyboru
  - `PlannedParamsEditor` (Client Component) - edycja parametrów planned\_\* dla ćwiczenia
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja po stronie klienta (Zod)
  - Komunikat błędu, jeśli próba zapisania planu bez ćwiczeń
  - Dialog wyboru ćwiczenia z wyszukiwaniem i filtrowaniem
  - Możliwość edycji parametrów planned\_\* inline lub przez kliknięcie
  - Toast notification przy udanym zapisie
  - Przekierowanie do listy planów po zapisie
  - Potwierdzenie przed opuszczeniem z niezapisanymi zmianami
  - ARIA labels
  - Focus management

#### 2.4.3 Widok szczegółów planu (`/workout-plans/[id]`)

- **Ścieżka**: `/workout-plans/[id]`
- **Główny cel**: Wyświetlenie szczegółów planu z możliwością edycji, usunięcia i rozpoczęcia sesji
- **Kluczowe informacje do wyświetlenia**:
  - Metadane planu (name, description, part)
  - Lista ćwiczeń w kolejności z parametrami planned\_\*
  - Przyciski akcji: "Edytuj", "Usuń", "Rozpocznij trening"
  - Informacja o liczbie sesji wykonanych z tego planu
- **Kluczowe komponenty widoku**:
  - `WorkoutPlanDetails` (Server Component) - szczegóły planu
  - `WorkoutPlanExercisesList` (Server Component) - lista ćwiczeń w planie
  - `WorkoutPlanActions` (Client Component) - przyciski akcji
  - `StartWorkoutButton` (Client Component) - przycisk rozpoczęcia sesji
  - `DeletePlanDialog` (Client Component) - dialog potwierdzenia usunięcia
- **UX, dostępność i względy bezpieczeństwa**:
  - Sheet lub pełnoekranowy widok (zależnie od urządzenia)
  - Przycisk "Rozpocznij trening" wyróżniony (primary button)
  - Dialog potwierdzenia przed usunięciem
  - Toast notification po udanym usunięciu
  - Informacja, że usunięcie planu nie usuwa historii sesji
  - ARIA labels
  - Keyboard shortcuts

### 2.5 Asystent treningowy (WorkoutSession)

#### 2.5.1 Widok asystenta treningowego (`/workout-sessions/[id]/active`)

- **Ścieżka**: `/workout-sessions/[id]/active`
- **Główny cel**: Prowadzenie użytkowniczki przez sesję treningową krok po kroku z zapisem wykonania
- **Kluczowe informacje do wyświetlenia**:
  - **Duży zegar na górze ekranu**:
    - Format: "Ćwiczenie [nazwa] Seria [numer]" + największe sekundy widoczne z 1,5m
    - Odliczanie przerwy od 0 (gdy użytkowniczka jest w przerwie)
    - Suma długości treningu mniejszą wartością poniżej (timer globalny sesji)
    - Status sesji (w trakcie/pauza) i numer bieżącego ćwiczenia (np. "Ćwiczenie 3 z 8")
    - Wizualna animacja (pulsowanie) gdy sesja aktywna
  - **Informacje o bieżącym ćwiczeniu**:
    - title, type, part
    - Parametry planned\_\*: planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds
  - **Formularz wprowadzania danych** (zawsze widoczny pod informacjami):
    - Pola actual\_\*: actual_count_sets, actual_sum_reps, actual_duration_seconds, actual_rest_seconds
    - Set logs jako lista serii z możliwością dodawania i edycji:
      - Dla każdej serii: set_number, reps, duration_seconds, weight_kg
      - Przycisk "Dodaj serię"
      - Przycisk usunięcia serii
    - Checkbox "Pomiń ćwiczenie" (skip)
  - **Duże przyciski nawigacji** (dostosowane do użycia jedną ręką):
    - "Previous" (poprzednie ćwiczenie) - disabled na pierwszym ćwiczeniu
    - "Pause" (pauza) - zatrzymuje timer i zapisuje stan
    - "Skip" (pomiń) - oznacza ćwiczenie jako pominięte i przechodzi dalej
    - "Next" (następne ćwiczenie) - zapisuje stan i przechodzi dalej (disabled przy nieprzechodzącej walidacji, chyba że skipowane)
  - **Wskaźnik autosave** (w rogu ekranu):
    - Ikona zapisu z animacją podczas zapisywania
    - Status: "Zapisano", "Zapisywanie...", "Błąd zapisu"
  - **Przycisk wyjścia** (w lewym górnym rogu):
    - "Wyjdź z treningu" z potwierdzeniem (sesja pozostaje in_progress)
- **Kluczowe komponenty widoku**:
  - `WorkoutSessionAssistant` (Client Component) - główny komponent asystenta
  - `WorkoutTimer` (Client Component) - duży zegar z timerem globalnym i odliczaniem przerwy
  - `CurrentExerciseInfo` (Client Component) - informacje o bieżącym ćwiczeniu
  - `ExerciseExecutionForm` (Client Component) - formularz wprowadzania danych
  - `SetLogsList` (Client Component) - lista serii z możliwością dodawania/edycji
  - `SetLogItem` (Client Component) - pojedyncza seria
  - `NavigationButtons` (Client Component) - duże przyciski nawigacji
  - `AutosaveIndicator` (Client Component) - wskaźnik statusu zapisu
  - `ExitSessionButton` (Client Component) - przycisk wyjścia
- **UX, dostępność i względy bezpieczeństwa**:
  - **Pełnoekranowy widok** bez widocznej nawigacji głównej
  - **Mobile-first**: duże przyciski na dole ekranu, formularz przewijalny
  - **Autosave w tle** przy każdej akcji (next/pause/skip) bez blokowania interakcji
  - **Walidacja set logs**: co najmniej jedna metryka (reps/duration/weight) w każdej serii
  - **Komunikaty błędów** inline przy polach oraz toast dla błędów globalnych
  - **Retry przy błędach sieciowych** z zachowaniem danych w formularzu
  - **Zustand store** dla stanu sesji (synchronizacja z API)
  - **Timer synchronizowany** z backendem (started_at, pauza/wznowienie)
  - **Keyboard shortcuts** (opcjonalnie): Space dla pause, Arrow keys dla nawigacji
  - **ARIA labels** dla wszystkich przycisków i pól
  - **Focus management**: automatyczne ustawienie focus na pierwsze pole formularza przy przejściu do ćwiczenia
  - **Prevent accidental navigation**: potwierdzenie przed wyjściem z sesji
  - **RLS** zapewnia, że użytkowniczka widzi tylko swoje sesje

#### 2.5.2 Widok wyboru planu do rozpoczęcia sesji (`/workout-sessions/start`)

- **Ścieżka**: `/workout-sessions/start`
- **Główny cel**: Wybór planu treningowego do rozpoczęcia sesji lub wznowienie istniejącej sesji in_progress
- **Kluczowe informacje do wyświetlenia**:
  - **Automatyczna propozycja wznowienia** (jeśli istnieje sesja in_progress):
    - Karta z informacją: nazwa planu, data rozpoczęcia, postęp (np. "Ćwiczenie 3 z 8")
    - Przyciski: "Wznów trening", "Anuluj sesję" (z potwierdzeniem)
  - **Lista dostępnych planów** (jeśli nie ma sesji in_progress):
    - Karty planów z nazwą, part, liczbą ćwiczeń
    - Przycisk "Rozpocznij" na każdej karcie
  - **Pusty stan** (jeśli brak planów):
    - Komunikat: "Utwórz plan treningowy, aby rozpocząć sesję"
    - CTA: "Utwórz plan"
- **Kluczowe komponenty widoku**:
  - `StartWorkoutSessionView` (Server Component) - główny widok
  - `ResumeSessionCard` (Client Component) - karta propozycji wznowienia
  - `WorkoutPlanSelector` (Server Component) - lista planów do wyboru
  - `WorkoutPlanStartCard` (Client Component) - karta planu z przyciskiem startu
  - `EmptyState` (Client Component) - pusty stan
- **UX, dostępność i względy bezpieczeństwa**:
  - Automatyczne wykrywanie sesji in_progress przy załadowaniu widoku
  - Wyróżniona propozycja wznowienia (jeśli istnieje)
  - Dialog potwierdzenia przed anulowaniem sesji in_progress
  - Toast notification po rozpoczęciu/wznowieniu sesji
  - Przekierowanie do asystenta treningowego po rozpoczęciu
  - Blokada rozpoczęcia nowej sesji, jeśli istnieje in_progress (z komunikatem)
  - ARIA labels
  - Keyboard navigation

### 2.6 Historia sesji treningowych

#### 2.6.1 Lista historii sesji (`/workout-sessions`)

- **Ścieżka**: `/workout-sessions`
- **Główny cel**: Wyświetlenie historii wszystkich sesji treningowych użytkowniczki
- **Kluczowe informacje do wyświetlenia**:
  - Lista sesji z kolumnami: data rozpoczęcia, nazwa planu (lub "Plan usunięty"), status (in_progress/completed), czas trwania
  - Filtry: status (dropdown: wszystkie/in_progress/completed), plan_id (dropdown), zakres dat (from/to)
  - Sortowanie: started_at (domyślnie desc), status, completed_at
  - Paginacja: "Load more"
  - Pusty stan z komunikatem: "Nie masz jeszcze żadnych sesji treningowych"
  - Dla sesji in_progress: przycisk "Wznów trening"
- **Kluczowe komponenty widoku**:
  - `WorkoutSessionsList` (Server Component) - lista sesji
  - `WorkoutSessionCard` (Server Component) - karta sesji
  - `WorkoutSessionFilters` (Client Component) - filtry
  - `WorkoutSessionSort` (Client Component) - sortowanie
  - `DateRangeFilter` (Client Component) - filtr zakresu dat
  - `EmptyState` (Client Component) - pusty stan
  - `ResumeSessionButton` (Client Component) - przycisk wznowienia
- **UX, dostępność i względy bezpieczeństwa**:
  - Skeleton loaders podczas ładowania
  - Filtry i sortowanie przez query params
  - Wyróżnienie sesji in_progress (np. badge "W trakcie")
  - Toast notification po wznowieniu sesji
  - Przekierowanie do asystenta po kliknięciu "Wznów trening"
  - Keyboard navigation
  - ARIA labels
  - RLS zapewnia izolację danych

#### 2.6.2 Widok szczegółów sesji (`/workout-sessions/[id]`)

- **Ścieżka**: `/workout-sessions/[id]`
- **Główny cel**: Wyświetlenie szczegółów sesji z porównaniem planu vs wykonania
- **Kluczowe informacje do wyświetlenia**:
  - **Metadane sesji**:
    - Data rozpoczęcia, data zakończenia (jeśli completed), czas trwania
    - Nazwa planu (lub "Plan usunięty" jeśli plan został usunięty)
    - Status (in_progress/completed)
  - **Lista ćwiczeń w kolejności z sesji** (tryb porównawczy):
    - Dla każdego ćwiczenia:
      - Sekcja "Planowane": planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds
      - Sekcja "Wykonane": actual_count_sets, actual_sum_reps, actual_duration_seconds, actual_rest_seconds, is_skipped
      - **Set logs** jako tabela/lista serii:
        - Kolumny: set_number, reps, duration_seconds, weight_kg
        - Wizualne wyróżnienie różnic między planem a wykonaniem
  - **Przyciski akcji**:
    - Dla sesji in_progress: "Wznów trening" (przekierowanie do asystenta)
    - Dla sesji completed: tylko podgląd (read-only)
- **Kluczowe komponenty widoku**:
  - `WorkoutSessionDetails` (Server Component) - szczegóły sesji
  - `WorkoutSessionMetadata` (Server Component) - metadane sesji
  - `WorkoutSessionExercisesList` (Server Component) - lista ćwiczeń
  - `WorkoutSessionExerciseItem` (Server Component) - pojedyncze ćwiczenie z porównaniem
  - `PlannedVsActualComparison` (Server Component) - komponent porównawczy
  - `SetLogsTable` (Server Component) - tabela serii
  - `ResumeSessionButton` (Client Component) - przycisk wznowienia (tylko dla in_progress)
- **UX, dostępność i względy bezpieczeństwa**:
  - Widok read-only (dla completed) lub z możliwością wznowienia (dla in_progress)
  - Wizualne wyróżnienie różnic (np. kolorami: zielony dla zgodności, żółty dla różnic)
  - Tabela serii z możliwością przewijania (jeśli dużo serii)
  - Responsywny layout: na mobile sekcje jedna pod drugą, na desktop obok siebie
  - ARIA labels dla tabel i porównań
  - Keyboard navigation
  - RLS zapewnia izolację danych

### 2.7 Rekordy (Personal Records)

#### 2.7.1 Lista rekordów (`/personal-records`)

- **Ścieżka**: `/personal-records`
- **Główny cel**: Wyświetlenie wszystkich rekordów użytkowniczki z możliwością filtrowania i sortowania
- **Kluczowe informacje do wyświetlenia**:
  - Lista ćwiczeń z rekordami (z możliwością rozwijania szczegółów):
    - Dla każdego ćwiczenia: nazwa, type, part
    - Wszystkie dostępne typy rekordów dla ćwiczenia:
      - max_reps: wartość, data osiągnięcia, link do sesji (opcjonalnie)
      - max_duration: wartość (w sekundach, wyświetlone jako mm:ss), data osiągnięcia, link do sesji
      - max_weight: wartość (w kg), data osiągnięcia, link do sesji
    - Badge "Nowy" dla rekordów osiągniętych w ostatniej sesji
  - Filtry: exercise_id (dropdown z listą ćwiczeń), metric_type (dropdown: wszystkie/max_reps/max_duration/max_weight)
  - Sortowanie: achieved_at (domyślnie desc - najnowsze pierwsze), value (desc)
  - Paginacja: "Load more"
  - Pusty stan z komunikatem: "Nie masz jeszcze żadnych rekordów. Rozpocznij trening, aby zacząć śledzić postępy!"
- **Kluczowe komponenty widoku**:
  - `PersonalRecordsList` (Server Component) - lista rekordów
  - `PersonalRecordCard` (Client Component) - karta ćwiczenia z rekordami (z możliwością rozwijania)
  - `PersonalRecordItem` (Server Component) - pojedynczy rekord (max_reps/max_duration/max_weight)
  - `PersonalRecordFilters` (Client Component) - filtry
  - `PersonalRecordSort` (Client Component) - sortowanie
  - `EmptyState` (Client Component) - pusty stan
  - `NewRecordBadge` (Client Component) - badge "Nowy" dla świeżych rekordów
- **UX, dostępność i względy bezpieczeństwa**:
  - Skeleton loaders podczas ładowania
  - Rozwijanie/zwijanie szczegółów rekordów (accordion pattern)
  - Wyróżnienie nowych rekordów (badge "Nowy")
  - Link do sesji prowadzi do szczegółów sesji, w której rekord został osiągnięty
  - Filtry i sortowanie przez query params
  - Toast notification przy kliknięciu linku do sesji
  - Keyboard navigation
  - ARIA labels dla accordionów
  - RLS zapewnia izolację danych

#### 2.7.2 Widok rekordów dla konkretnego ćwiczenia (`/personal-records/[exercise_id]`)

- **Ścieżka**: `/personal-records/[exercise_id]`
- **Główny cel**: Wyświetlenie wszystkich rekordów dla wybranego ćwiczenia
- **Kluczowe informacje do wyświetlenia**:
  - Informacje o ćwiczeniu (title, type, part)
  - Wszystkie typy rekordów dla ćwiczenia (max_reps, max_duration, max_weight) z wartością, datą osiągnięcia i linkiem do sesji
  - Historia rekordów (jeśli dostępna): lista poprzednich rekordów z datami
- **Kluczowe komponenty widoku**:
  - `ExercisePersonalRecords` (Server Component) - rekordy dla ćwiczenia
  - `ExerciseInfo` (Server Component) - informacje o ćwiczeniu
  - `PersonalRecordDetails` (Server Component) - szczegóły rekordów
  - `PersonalRecordHistory` (Server Component) - historia rekordów (jeśli dostępna)
- **UX, dostępność i względy bezpieczeństwa**:
  - Sheet lub pełnoekranowy widok
  - Link do sesji prowadzi do szczegółów sesji
  - ARIA labels
  - Keyboard navigation
  - RLS zapewnia izolację danych

### 2.8 Integracja AI (planned na późniejszy etap)

#### 2.8.1 Formularz generowania planu przez AI (`/workout-plans/ai/generate`)

- **Ścieżka**: `/workout-plans/ai/generate`
- **Główny cel**: Generowanie nowego planu treningowego przez AI na podstawie parametrów użytkowniczki
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami:
    - goal (dropdown lub textarea)
    - level (dropdown)
    - duration_minutes (number input)
    - parts (multi-select: Legs | Core | Back | Arms | Chest)
    - equipment (opcjonalny, multi-select lub textarea)
  - Licznik pozostałych użyć AI: "Pozostało: X/5 użyć w tym miesiącu" (z datą resetu)
  - Przyciski: "Wygeneruj plan", "Anuluj"
  - Progress bar lub modal z postępem podczas generowania
  - Podgląd wygenerowanego planu z możliwością zapisania lub odrzucenia
- **Kluczowe komponenty widoku**:
  - `AIGeneratePlanForm` (Client Component) - formularz generowania
  - `AIUsageCounter` (Client Component) - licznik użyć AI
  - `AIGenerateButton` (Client Component) - przycisk generowania z loading state
  - `AIGeneratedPlanPreview` (Client Component) - podgląd wygenerowanego planu
  - `SaveAIGeneratedPlanDialog` (Client Component) - dialog zapisu planu
- **UX, dostępność i względy bezpieczeństwa**:
  - Blokada, jeśli użytkowniczka nie ma żadnych ćwiczeń (z komunikatem i CTA do dodania ćwiczenia)
  - Blokada, jeśli limit użyć AI został przekroczony (z komunikatem i datą resetu)
  - Walidacja formularza po stronie klienta
  - Progress indicator podczas generowania (może trwać kilka sekund)
  - Toast notification przy błędach (429 limit exceeded, 400 validation, 500 system error)
  - Retry przy błędach systemowych (5xx) bez zmniejszania limitu
  - Podgląd planu przed zapisaniem (użytkowniczka może odrzucić i wygenerować ponownie)
  - ARIA labels
  - Focus management

#### 2.8.2 Formularz optymalizacji planu przez AI (`/workout-plans/[id]/ai/optimize`)

- **Ścieżka**: `/workout-plans/[id]/ai/optimize`
- **Główny cel**: Optymalizacja istniejącego planu treningowego przez AI
- **Kluczowe informacje do wyświetlenia**:
  - Informacje o planie do optymalizacji (name, lista ćwiczeń)
  - Formularz z polami (opcjonalne, można zmienić tylko wybrane):
    - goal (dropdown lub textarea)
    - level (dropdown)
    - duration_minutes (number input)
    - parts (multi-select)
    - equipment (opcjonalny)
  - Licznik pozostałych użyć AI
  - Przyciski: "Zoptymalizuj plan", "Anuluj"
  - Progress bar podczas optymalizacji
  - Podgląd zoptymalizowanego planu z porównaniem do oryginału
- **Kluczowe komponenty widoku**:
  - `AIOptimizePlanForm` (Client Component) - formularz optymalizacji
  - `OriginalPlanInfo` (Server Component) - informacje o oryginalnym planie
  - `AIOptimizeButton` (Client Component) - przycisk optymalizacji
  - `AIOptimizedPlanPreview` (Client Component) - podgląd zoptymalizowanego planu z porównaniem
  - `SaveAIOptimizedPlanDialog` (Client Component) - dialog zapisu zoptymalizowanego planu
- **UX, dostępność i względy bezpieczeństwa**:
  - Podobne jak w generowaniu: blokady, walidacja, progress indicator, toast notifications
  - Wizualne porównanie oryginału vs zoptymalizowanego planu
  - Możliwość zapisania jako nowy plan lub nadpisania istniejącego (z potwierdzeniem)
  - ARIA labels
  - Focus management

## 3. Mapa podróży użytkownika

### 3.1 Główny przepływ: od rejestracji do ukończenia sesji treningowej

#### Krok 1: Rejestracja/Logowanie

- Użytkowniczka wchodzi na stronę główną (`/`)
- Middleware przekierowuje do `/login` (jeśli nie jest zalogowana)
- Użytkowniczka wypełnia formularz logowania lub rejestracji
- Po udanym logowaniu przekierowanie do głównego widoku (`/exercises`)

#### Krok 2: Dodanie pierwszych ćwiczeń

- Użytkowniczka widzi pusty stan na liście ćwiczeń (`/exercises`)
- Kliknięcie "Dodaj pierwsze ćwiczenie" prowadzi do formularza (`/exercises/new`)
- Wypełnienie formularza z walidacją (title, type, part, reps/duration, series, rest)
- Zapis ćwiczenia i powrót do listy
- Powtórzenie dla kilku ćwiczeń (minimum 1, zalecane 5-10)

#### Krok 3: Utworzenie planu treningowego

- Przejście do sekcji "Plany treningowe" (`/workout-plans`)
- Kliknięcie "Utwórz plan" (`/workout-plans/new`)
- Wypełnienie metadanych planu (name, description, part)
- Dodanie ćwiczeń z biblioteki (dialog wyboru)
- Ustawienie parametrów planned\_\* dla każdego ćwiczenia
- Zapis planu i powrót do listy

#### Krok 4: Rozpoczęcie sesji treningowej

- Przejście do sekcji "Start treningu" (`/workout-sessions/start`)
- Wybór planu z listy (lub wznowienie sesji in_progress, jeśli istnieje)
- Kliknięcie "Rozpocznij trening"
- Przekierowanie do asystenta treningowego (`/workout-sessions/[id]/active`)

#### Krok 5: Wykonanie treningu w asystencie

- Asystent wyświetla pierwsze ćwiczenie z planowanymi parametrami
- Użytkowniczka wprowadza faktyczne wykonanie (actual\_\* i set logs)
- Kliknięcie "Next" zapisuje dane i przechodzi do następnego ćwiczenia
- Możliwość użycia "Previous" do powrotu do poprzedniego ćwiczenia
- Możliwość użycia "Skip" do pominięcia ćwiczenia
- Możliwość użycia "Pause" do zatrzymania sesji (timer i autosave)
- Po przejściu przez wszystkie ćwiczenia sesja automatycznie otrzymuje status "completed"

#### Krok 6: Przegląd historii i rekordów

- Po zakończeniu sesji użytkowniczka może wyjść z asystenta
- Przejście do sekcji "Historia sesji" (`/workout-sessions`)
- Przegląd listy sesji z filtrowaniem i sortowaniem
- Kliknięcie sesji prowadzi do szczegółów (`/workout-sessions/[id]`)
- Przegląd porównania planu vs wykonania oraz set logs
- Przejście do sekcji "Rekordy" (`/personal-records`)
- Przegląd automatycznie wykrytych rekordów z datami osiągnięcia

### 3.2 Alternatywne przepływy

#### Przepływ A: Wznowienie przerwanej sesji

- Użytkowniczka rozpoczyna sesję i przerywa ją (pause lub wyjście)
- Sesja pozostaje w statusie "in_progress"
- Przy następnym wejściu do "Start treningu" widzi propozycję wznowienia
- Kliknięcie "Wznów trening" prowadzi do asystenta z ostatnim miejscem w sesji
- Możliwość kontynuacji od miejsca przerwania

#### Przepływ B: Edycja ćwiczenia w sesji

- Użytkowniczka przechodzi "Previous" do wcześniejszego ćwiczenia
- Wprowadza poprawki w actual\_\* lub set logs
- Kliknięcie "Next" nadpisuje wcześniejsze dane
- PR zostają automatycznie przeliczone na podstawie nowych danych

#### Przepływ C: Usunięcie ćwiczenia z historią

- Użytkowniczka próbuje usunąć ćwiczenie, które jest używane w sesjach/PR
- Aplikacja blokuje usunięcie z komunikatem: "Nie można usunąć ćwiczenia, ponieważ jest używane w historii treningów"
- Przycisk "Usuń" jest disabled z tooltipem wyjaśniającym

#### Przepływ D: Generowanie planu przez AI (planned)

- Użytkowniczka przechodzi do "Plany treningowe" → "Wygeneruj przez AI"
- Wypełnia formularz z parametrami (goal, level, duration, parts, equipment)
- System generuje plan używając tylko ćwiczeń z biblioteki użytkowniczki
- Podgląd wygenerowanego planu z możliwością zapisania lub odrzucenia
- Po zapisaniu plan jest dostępny jak każdy inny plan

### 3.3 Przepływy błędów i przypadków brzegowych

#### Przepływ E: Błąd autosave podczas sesji

- Użytkowniczka wprowadza dane i klika "Next"
- Zapis nie powiedzie się (błąd sieci lub serwera)
- Aplikacja pokazuje toast notification z błędem
- Dane pozostają w formularzu (nie znikają)
- Możliwość retry z przyciskiem "Spróbuj ponownie"
- Przycisk "Next" pozostaje disabled do czasu udanego zapisu

#### Przepływ F: Próba rozpoczęcia nowej sesji przy istniejącej in_progress

- Użytkowniczka ma sesję in_progress
- Próbuje rozpocząć nową sesję z innego planu
- Aplikacja blokuje start i pokazuje komunikat: "Masz aktywną sesję. Wznów istniejącą sesję lub zakończ ją przed rozpoczęciem nowej"
- Opcja: "Wznów istniejącą sesję" lub "Anuluj sesję" (z potwierdzeniem)

#### Przepływ G: Limit użyć AI przekroczony

- Użytkowniczka próbuje wygenerować/zoptymalizować plan przez AI
- Limit 5 użyć w miesiącu został przekroczony
- Aplikacja pokazuje komunikat: "Osiągnięto limit użyć AI (5/miesiąc). Limit zostanie zresetowany [data resetu]"
- Przycisk "Wygeneruj" jest disabled

#### Przepływ H: Brak ćwiczeń w bibliotece

- Użytkowniczka próbuje utworzyć plan bez ćwiczeń w bibliotece
- Dialog wyboru ćwiczeń jest pusty
- Komunikat: "Dodaj co najmniej jedno ćwiczenie do biblioteki, aby utworzyć plan"
- CTA: "Dodaj ćwiczenie" (przekierowanie do `/exercises/new`)

## 4. Układ i struktura nawigacji

### 4.1 Główna nawigacja

#### Mobile (< 768px): Bottom Navigation

- **Pozycja**: Stały pasek na dole ekranu (fixed bottom)
- **Sekcje**:
  1. **Biblioteka ćwiczeń** (ikona: dumbbell/list) → `/exercises`
  2. **Plany treningowe** (ikona: calendar/clipboard) → `/workout-plans`
  3. **Start treningu** (ikona: play, wyróżniony przycisk FAB) → `/workout-sessions/start`
  4. **Historia sesji** (ikona: history/clock) → `/workout-sessions`
  5. **Rekordy** (ikona: trophy/star) → `/personal-records`
- **Wyróżnienie**: Przycisk "Start treningu" jako Floating Action Button (FAB) w centrum, większy niż pozostałe
- **Aktywna sekcja**: Wizualnie wyróżniona (kolor, podkreślenie)

#### Desktop (≥ 768px): Top Navigation Bar

- **Pozycja**: Stały pasek na górze ekranu (fixed top)
- **Sekcje**: Tabs (shadcn/ui) z etykietami tekstowymi
- **Layout**:
  - Lewa strona: Logo/Nazwa aplikacji + Tabs (Biblioteka ćwiczeń, Plany treningowe, Historia sesji, Rekordy)
  - Prawa strona: Przycisk "Start treningu" (primary button) + Menu użytkowniczki (dropdown)
- **Aktywna sekcja**: Wizualnie wyróżniona (underline, kolor)

### 4.2 Nawigacja w asystencie treningowym

- **Pełnoekranowy widok** bez widocznej nawigacji głównej
- **Przycisk wyjścia** w lewym górnym rogu (ikona: X lub "Wyjdź")
- **Potwierdzenie przed wyjściem**: Dialog "Czy na pewno chcesz wyjść? Sesja zostanie zapisana i możesz ją wznowić później"
- **Opcje**: "Tak, wyjdź" (zapisuje i przekierowuje do listy sesji), "Anuluj" (pozostaje w asystencie)

### 4.3 Breadcrumbs (opcjonalnie, dla desktop)

- **Gdzie**: Widoki szczegółów (ćwiczenie, plan, sesja)
- **Format**: Home > Sekcja > Szczegóły (np. "Plany treningowe > Plan na nogi")
- **Funkcjonalność**: Kliknięcie w breadcrumb prowadzi do odpowiedniej sekcji

### 4.4 Nawigacja klawiaturowa

- **Tab**: Przejście między interaktywnymi elementami
- **Enter/Space**: Aktywacja przycisku/linku
- **Escape**: Zamknięcie modali/dialogów/sheetów
- **Arrow keys**: Nawigacja w listach (opcjonalnie)
- **Keyboard shortcuts w asystencie** (opcjonalnie): Space dla pause, Arrow Left/Right dla previous/next

### 4.5 Deep linking i URL state

- **Wszystkie filtry i sortowanie** zapisane w query params (np. `/exercises?part=Legs&sort=title&order=asc`)
- **Możliwość udostępnienia linku** do konkretnego widoku z filtrami
- **Browser back/forward** działa poprawnie z zachowaniem stanu

## 5. Kluczowe komponenty

### 5.1 Komponenty nawigacji

#### `MainLayout`

- **Typ**: Server Component
- **Cel**: Główny wrapper dla wszystkich widoków aplikacji
- **Funkcjonalność**: Renderuje nawigację (mobile/desktop), sprawdza autoryzację, zapewnia spójny layout
- **Użycie**: W `app/layout.tsx`

#### `BottomNavigation` (mobile)

- **Typ**: Client Component
- **Cel**: Dolny pasek nawigacji na mobile
- **Funkcjonalność**: Ikony z etykietami, wyróżnienie aktywnej sekcji, FAB dla "Start treningu"
- **Props**: `activeSection` (string)

#### `TopNavigation` (desktop)

- **Typ**: Client Component
- **Cel**: Górny pasek nawigacji na desktop
- **Funkcjonalność**: Tabs z etykietami, przycisk "Start treningu", menu użytkowniczki
- **Props**: `activeSection` (string)

#### `QuickStartButton`

- **Typ**: Client Component
- **Cel**: Wyróżniony przycisk szybkiego startu sesji
- **Funkcjonalność**: FAB na mobile, primary button na desktop, przekierowanie do `/workout-sessions/start`
- **Użycie**: W nawigacji głównej

### 5.2 Komponenty formularzy

#### `ExerciseForm`

- **Typ**: Client Component
- **Cel**: Formularz tworzenia/edycji ćwiczenia
- **Funkcjonalność**: Walidacja Zod, komunikaty błędów inline, optymistyczne aktualizacje
- **Props**: `exerciseId?` (dla edycji), `onSubmit`, `onCancel`

#### `WorkoutPlanForm`

- **Typ**: Client Component
- **Cel**: Formularz tworzenia/edycji planu treningowego
- **Funkcjonalność**: Zarządzanie listą ćwiczeń, edycja parametrów planned\_\*, walidacja (co najmniej jedno ćwiczenie)
- **Props**: `planId?` (dla edycji), `onSubmit`, `onCancel`

#### `ExerciseExecutionForm`

- **Typ**: Client Component
- **Cel**: Formularz wprowadzania danych wykonania ćwiczenia w asystencie
- **Funkcjonalność**: Pola actual\_\*, lista set logs z dodawaniem/edycją, walidacja serii
- **Props**: `exercise` (dane ćwiczenia), `onSave`, `onSkip`

### 5.3 Komponenty list

#### `ExercisesList`

- **Typ**: Server Component
- **Cel**: Lista ćwiczeń z fetchowaniem danych
- **Funkcjonalność**: Renderowanie kart ćwiczeń, obsługa pustego stanu, integracja z filtrami i sortowaniem
- **Props**: `filters`, `sort`, `order`

#### `WorkoutPlansList`

- **Typ**: Server Component
- **Cel**: Lista planów treningowych
- **Funkcjonalność**: Renderowanie kart planów, obsługa pustego stanu, integracja z filtrami
- **Props**: `filters`, `sort`, `order`

#### `WorkoutSessionsList`

- **Typ**: Server Component
- **Cel**: Lista sesji treningowych (historia)
- **Funkcjonalność**: Renderowanie kart sesji, obsługa pustego stanu, wyróżnienie sesji in_progress
- **Props**: `filters`, `sort`, `order`

#### `PersonalRecordsList`

- **Typ**: Server Component
- **Cel**: Lista rekordów użytkowniczki
- **Funkcjonalność**: Renderowanie kart ćwiczeń z rekordami (accordion), obsługa pustego stanu
- **Props**: `filters`, `sort`, `order`

### 5.4 Komponenty asystenta treningowego

#### `WorkoutSessionAssistant`

- **Typ**: Client Component
- **Cel**: Główny komponent asystenta treningowego
- **Funkcjonalność**: Zarządzanie stanem sesji (Zustand), nawigacja między ćwiczeniami, autosave, integracja z timerem
- **Props**: `sessionId` (string)

#### `WorkoutTimer`

- **Typ**: Client Component
- **Cel**: Duży zegar z timerem globalnym i odliczaniem przerwy
- **Funkcjonalność**: Wyświetlanie czasu sesji, odliczanie przerwy, animacja pulsowania, synchronizacja z backendem
- **Props**: `sessionId`, `isPaused`, `onPause`, `onResume`

#### `SetLogsList`

- **Typ**: Client Component
- **Cel**: Lista serii (set logs) z możliwością dodawania i edycji
- **Funkcjonalność**: Dodawanie/usuwanie serii, edycja wartości (reps/duration/weight), walidacja (co najmniej jedna metryka)
- **Props**: `sets` (array), `onChange`, `onAdd`, `onRemove`

#### `NavigationButtons`

- **Typ**: Client Component
- **Cel**: Duże przyciski nawigacji w asystencie
- **Funkcjonalność**: Previous, Pause, Skip, Next z odpowiednimi akcjami i stanami disabled
- **Props**: `onPrevious`, `onPause`, `onSkip`, `onNext`, `canGoPrevious`, `canGoNext`, `isPaused`

#### `AutosaveIndicator`

- **Typ**: Client Component
- **Cel**: Wskaźnik statusu autosave
- **Funkcjonalność**: Ikona zapisu z animacją, status: "Zapisano", "Zapisywanie...", "Błąd zapisu"
- **Props**: `status` ("saved" | "saving" | "error")

### 5.5 Komponenty szczegółów

#### `WorkoutSessionDetails`

- **Typ**: Server Component
- **Cel**: Szczegóły sesji treningowej z porównaniem planu vs wykonania
- **Funkcjonalność**: Wyświetlanie metadanych, listy ćwiczeń, set logs, tryb porównawczy
- **Props**: `sessionId` (string)

#### `PlannedVsActualComparison`

- **Typ**: Server Component
- **Cel**: Komponent porównawczy planu vs wykonania
- **Funkcjonalność**: Wyświetlanie sekcji "Planowane" i "Wykonane" obok siebie, wizualne wyróżnienie różnic
- **Props**: `planned` (object), `actual` (object)

#### `SetLogsTable`

- **Typ**: Server Component
- **Cel**: Tabela serii (set logs) w widoku szczegółów sesji
- **Funkcjonalność**: Wyświetlanie serii w formie tabeli (read-only), kolumny: set_number, reps, duration_seconds, weight_kg
- **Props**: `sets` (array)

### 5.6 Komponenty pomocnicze

#### `EmptyState`

- **Typ**: Client Component
- **Cel**: Pusty stan dla list
- **Funkcjonalność**: Ikona, komunikat, CTA (Call to Action)
- **Props**: `icon`, `title`, `description`, `ctaLabel`, `ctaHref`

#### `SkeletonLoader`

- **Typ**: Client Component
- **Cel**: Skeleton loader dla list podczas ładowania
- **Funkcjonalność**: Używa Skeleton z shadcn/ui, symuluje strukturę listy
- **Props**: `count` (liczba elementów do wyświetlenia)

#### `ErrorToast`

- **Typ**: Client Component
- **Cel**: Toast notification dla błędów
- **Funkcjonalność**: Używa Toast z shadcn/ui, wyświetla komunikaty błędów po polsku
- **Props**: `error` (object z code, message, details)

#### `ConfirmDialog`

- **Typ**: Client Component
- **Cel**: Dialog potwierdzenia akcji
- **Funkcjonalność**: Używa Dialog z shadcn/ui, potwierdzenie przed usunięciem/wyjściem
- **Props**: `title`, `description`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel`

### 5.7 Komponenty AI (planned)

#### `AIGeneratePlanForm`

- **Typ**: Client Component
- **Cel**: Formularz generowania planu przez AI
- **Funkcjonalność**: Pola formularza, walidacja, integracja z API, progress indicator
- **Props**: `onSuccess`, `onCancel`

#### `AIOptimizePlanForm`

- **Typ**: Client Component
- **Cel**: Formularz optymalizacji planu przez AI
- **Funkcjonalność**: Podobne do generowania, dodatkowo wyświetla oryginalny plan
- **Props**: `planId`, `onSuccess`, `onCancel`

#### `AIUsageCounter`

- **Typ**: Client Component
- **Cel**: Licznik pozostałych użyć AI
- **Funkcjonalność**: Wyświetla "Pozostało: X/5 użyć w tym miesiącu" z datą resetu
- **Props**: `remaining`, `used`, `resetAt`

### 5.8 Store (Zustand)

#### `useWorkoutSessionStore`

- **Typ**: Zustand store
- **Cel**: Globalny stan sesji treningowej
- **Stan**:
  - `currentSession`: `{ id, status, current_position, started_at }`
  - `exercises`: `Array<{ order, exercise_id, planned_*, actual_*, sets }>`
  - `timerState`: `{ isRunning, isPaused, elapsedSeconds }`
- **Akcje**:
  - `setSession(session)`: Ustawia aktualną sesję
  - `updateExercise(order, data)`: Aktualizuje dane ćwiczenia
  - `setTimerState(state)`: Aktualizuje stan timera
  - `syncWithAPI()`: Synchronizuje stan z API

---

## Podsumowanie mapowania wymagań

### Historyjki użytkownika z PRD → Widoki UI

- **US-001, US-002, US-003** (Konta, dostęp, bezpieczeństwo) → Widoki logowania/rejestracji (`/login`, `/register`, `/reset-password`) + Middleware
- **US-010 do US-016** (Ćwiczenia CRUD) → Widoki biblioteki ćwiczeń (`/exercises`, `/exercises/new`, `/exercises/[id]/edit`, `/exercises/[id]`)
- **US-020 do US-026** (Plany treningowe CRUD) → Widoki planów (`/workout-plans`, `/workout-plans/new`, `/workout-plans/[id]/edit`, `/workout-plans/[id]`)
- **US-030 do US-043** (Asystent sesji) → Widok asystenta (`/workout-sessions/[id]/active`) + Widok startu (`/workout-sessions/start`)
- **US-050, US-051** (Set logs) → Formularz w asystencie (`ExerciseExecutionForm`, `SetLogsList`)
- **US-060 do US-063** (PR) → Widoki rekordów (`/personal-records`, `/personal-records/[exercise_id]`)
- **US-070 do US-072** (Historia) → Widoki historii sesji (`/workout-sessions`, `/workout-sessions/[id]`)
- **US-080 do US-087** (AI) → Widoki AI (`/workout-plans/ai/generate`, `/workout-plans/[id]/ai/optimize`) - planned
- **US-090** (Spójność danych) → Komunikaty błędów w formularzach usuwania

### Endpointy API → Komponenty UI

- **POST/GET/PATCH/DELETE `/api/exercises`** → `ExerciseForm`, `ExercisesList`, `ExerciseDetails`
- **POST/GET/PATCH/DELETE `/api/workout-plans`** → `WorkoutPlanForm`, `WorkoutPlansList`, `WorkoutPlanDetails`
- **POST/GET `/api/workout-sessions`** → `StartWorkoutSessionView`, `WorkoutSessionsList`
- **GET/PATCH `/api/workout-sessions/[id]`** → `WorkoutSessionDetails`
- **PATCH `/api/workout-sessions/[id]/exercises/[order]`** → `WorkoutSessionAssistant`, `ExerciseExecutionForm`
- **GET `/api/personal-records`** → `PersonalRecordsList`
- **POST `/api/ai/generate-plan`** → `AIGeneratePlanForm` (planned)
- **POST `/api/ai/optimize-plan`** → `AIOptimizePlanForm` (planned)

### Punkty bólu użytkownika → Rozwiązania UI

- **"Planowanie w notatkach/arkuszach: brak spójnego modelu danych"** → Strukturyzowane formularze CRUD dla ćwiczeń i planów
- **"Trudne porównanie planu do wykonania"** → Widok szczegółów sesji z trybem porównawczym (`PlannedVsActualComparison`)
- **"Ręczne liczenie rekordów"** → Automatyczne wykrywanie PR z wizualnym wyróżnieniem (`NewRecordBadge`)
- **"Powtarzalne układanie treningów"** → Plany treningowe jako szablony wielokrotnego użytku
- **"Brak wsparcia preferencji"** → Integracja AI (planned) dla generowania/optymalizacji planów
- **"Utrata danych przy przerwaniu treningu"** → Autosave w asystencie z wskaźnikiem statusu (`AutosaveIndicator`)
- **"Trudność w śledzeniu postępów"** → Widok rekordów z historią i linkami do sesji

---

_Dokument architektury UI został stworzony na podstawie PRD, planu API i notatek z sesji planowania. Wszystkie widoki, komponenty i przepływy są zgodne z wymaganiami produktu i możliwościami API._
