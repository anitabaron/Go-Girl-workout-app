# Plan Testów - Go Girl Workout App

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy dokument stanowi kompleksowy plan testów dla aplikacji **Go Girl Workout App** - prywatnej aplikacji webowej do planowania i logowania treningów, przeznaczonej dla kobiet trenujących regularnie (szczególnie kalistenikę i trening siłowy).

### 1.2 Cele testowania

Głównymi celami procesu testowania są:

- **Weryfikacja funkcjonalności**: Upewnienie się, że wszystkie funkcjonalności działają zgodnie z wymaganiami
- **Zapewnienie bezpieczeństwa**: Weryfikacja izolacji danych użytkowników poprzez RLS (Row Level Security)
- **Sprawdzenie jakości**: Wykrycie i eliminacja defektów przed wdrożeniem na produkcję
- **Walidacja integracji**: Sprawdzenie poprawności współpracy między komponentami frontendowymi, API routes i bazą danych
- **Ocena użyteczności**: Weryfikacja, że aplikacja jest intuicyjna i łatwa w użyciu
- **Testowanie wydajności**: Zapewnienie, że aplikacja działa płynnie przy typowym obciążeniu

### 1.3 Zakres dokumentu

Plan testów obejmuje:
- Testy jednostkowe (Unit Tests)
- Testy integracyjne (Integration Tests)
- Testy end-to-end (E2E Tests)
- Testy bezpieczeństwa (Security Tests)
- Testy wydajnościowe (Performance Tests)
- Testy użyteczności (Usability Tests)

### 1.4 Strategia wyboru narzędzi testowych

Aplikacja wykorzystuje następujące narzędzia testowe:

#### 1.4.1 Vitest - Testy jednostkowe i integracyjne
**Dlaczego Vitest?**
- **Szybkość**: Oparty na Vite, zapewnia bardzo szybkie uruchamianie testów i hot reload
- **Kompatybilność**: Natywne wsparcie dla ESM, TypeScript i Next.js
- **Znajomość API**: Kompatybilny API z Jest, co ułatwia migrację i znajomość
- **Wydajność**: Znacznie szybszy niż tradycyjne narzędzia, szczególnie w trybie watch
- **Ekosystem**: Doskonała integracja z React Testing Library i narzędziami frontendowymi
- **Coverage**: Wbudowane wsparcie dla raportów pokrycia kodu

#### 1.4.2 Playwright - Testy end-to-end
**Dlaczego Playwright?**
- **Niezawodność**: Automatyczne czekanie na elementy (auto-waiting) eliminuje flaky tests
- **Wieloplatformowość**: Wsparcie dla Chromium, Firefox i WebKit z jednej konfiguracji
- **Next.js**: Doskonałe wsparcie dla SSR, API routes i App Router
- **Debugowanie**: Trace viewer i screenshots automatycznie przy błędach
- **Wydajność**: Parallel execution i szybkie uruchamianie testów
- **TypeScript**: Natywne wsparcie dla TypeScript bez dodatkowej konfiguracji
- **Codegen**: Narzędzie do generowania testów poprzez nagrywanie interakcji

**Kombinacja Vitest + Playwright** zapewnia:
- Szybkie testy jednostkowe (Vitest) dla szybkiego feedbacku podczas rozwoju
- Solidne testy E2E (Playwright) dla weryfikacji pełnych przepływów użytkownika
- Spójne środowisko TypeScript w całym stacku testowym
- Doskonałą integrację z Next.js 16 i React 19

---

## 2. Zakres testów

### 2.1 Moduły objęte testowaniem

#### 2.1.1 Autentykacja i autoryzacja
- Rejestracja nowych użytkowników
- Logowanie użytkowników
- Reset hasła (wysyłanie linku i potwierdzenie)
- Zarządzanie sesją użytkownika
- Middleware ochrony tras
- Callback Supabase Auth

#### 2.1.2 Biblioteka ćwiczeń
- Tworzenie ćwiczeń (CRUD)
- Listowanie ćwiczeń z filtrowaniem i sortowaniem
- Edycja ćwiczeń
- Usuwanie ćwiczeń (z walidacją powiązań)
- Walidacja danych wejściowych
- Normalizacja tytułów ćwiczeń

#### 2.1.3 Plany treningowe
- Tworzenie planów treningowych
- Dodawanie ćwiczeń do planów
- Edycja planów
- Usuwanie planów
- Listowanie planów
- Szacowanie czasu trwania treningu

#### 2.1.4 Sesje treningowe
- Rozpoczynanie sesji treningowej
- Asystent treningowy (krok po kroku)
- Autosave postępu treningu
- Zarządzanie stanem sesji (in_progress, completed, paused)
- Timer sesji treningowej
- Nawigacja między ćwiczeniami (Next, Previous, Skip)
- Porównanie planowanych vs faktycznych wyników
- Historia sesji treningowych

#### 2.1.5 Rekordy osobiste (Personal Records)
- Automatyczne wykrywanie rekordów
- Listowanie rekordów
- Szczegóły rekordów dla konkretnego ćwiczenia
- Historia rekordów w czasie

#### 2.1.6 Bezpieczeństwo i izolacja danych
- Row Level Security (RLS) w Supabase
- Weryfikacja, że użytkownicy widzą tylko swoje dane
- Ochrona API routes przed nieautoryzowanym dostępem
- Walidacja sesji użytkownika

### 2.2 Moduły wyłączone z testowania (na obecnym etapie)

- Funkcjonalności AI (generowanie/optymalizacja planów) - w fazie planowania
- Funkcje administracyjne (cleanup orphaned sets)

---

## 3. Typy testów do przeprowadzenia

### 3.1 Testy jednostkowe (Unit Tests)

**Cel**: Weryfikacja działania pojedynczych funkcji, komponentów i modułów w izolacji.

**Zakres**:
- Funkcje walidacji (Zod schemas)
- Funkcje pomocnicze (utils)
- Funkcje obliczeniowe (np. agregaty z serii, czas trwania)
- Komponenty React (renderowanie, props, state)
- Hooks React (custom hooks)
- Funkcje serwisowe (services)
- Funkcje repozytoriów (repositories)

**Narzędzia**: Vitest, React Testing Library, @testing-library/react-hooks

**Priorytet**: Wysoki

### 3.2 Testy integracyjne (Integration Tests)

**Cel**: Weryfikacja współpracy między komponentami systemu.

**Zakres**:
- Integracja API routes z serwisami
- Integracja serwisów z repozytoriami
- Integracja komponentów z hooks
- Integracja z Supabase (z użyciem testowej bazy danych)
- Integracja formularzy z walidacją
- Integracja nawigacji z middleware

**Narzędzia**: Vitest, Next.js Test Utils, Supabase Test Client

**Priorytet**: Wysoki

### 3.3 Testy end-to-end (E2E Tests)

**Cel**: Weryfikacja pełnych przepływów użytkownika od początku do końca.

**Zakres**:
- Pełny przepływ rejestracji i pierwszego logowania
- Przepływ tworzenia ćwiczenia i dodania do planu
- Przepływ rozpoczęcia i ukończenia sesji treningowej
- Przepływ resetu hasła
- Przepływ przeglądania historii i rekordów

**Narzędzia**: Playwright

**Priorytet**: Średni-Wysoki

#### 3.3.1 Ważne uwagi dotyczące testów E2E

**⚠️ Problem z cache'owaniem danych po edycji**

Po edycji planu treningowego (lub innych encji), testy mogą napotkać problem z cache'owaniem danych w przeglądarce. Next.js i przeglądarka mogą cache'ować dane, co prowadzi do sytuacji, gdzie test sprawdza stare dane zamiast zaktualizowanych.

**Objawy problemu**:
- Test sprawdza, że stara nazwa planu nie istnieje, ale nadal jest widoczna w liście
- Test sprawdza zaktualizowane dane, ale widzi stare wartości
- Test przechodzi na głównej gałęzi, ale nie przechodzi na branchu z wprowadzonymi zmianami

**Rozwiązanie**:
Po edycji i nawigacji do strony listy, **zawsze dodaj `page.reload()`** przed weryfikacją danych:

```typescript
// ❌ Błędne - może pokazywać cache'owane dane
await workoutPlanFormPage.submit();
await workoutPlanFormPage.waitForSaveNavigation();
await workoutPlansPage.goto();
await workoutPlansPage.waitForList();
const oldNameExists = await workoutPlansPage.hasPlanWithName(oldName); // Może zwrócić true z cache

// ✅ Poprawne - odświeża stronę przed weryfikacją
await workoutPlanFormPage.submit();
await workoutPlanFormPage.waitForSaveNavigation();
await workoutPlansPage.goto();
await page.waitForLoadState("networkidle");
await page.reload(); // ⚠️ WAŻNE: Odśwież stronę, aby pobrać najnowsze dane z serwera
await page.waitForLoadState("networkidle");
await workoutPlansPage.waitForList();
const oldNameExists = await workoutPlansPage.hasPlanWithName(oldName); // Teraz zwróci poprawną wartość
```

**Kiedy używać `page.reload()`**:
- Po edycji planu treningowego i nawigacji do listy
- Po edycji ćwiczenia i nawigacji do listy
- Po każdej operacji modyfikującej dane, gdy następnie weryfikujesz zmiany na liście
- Gdy test sprawdza, że stara wartość nie istnieje, a nowa istnieje

**Kiedy NIE używać `page.reload()`**:
- Bezpośrednio po utworzeniu nowego obiektu (dane są świeże)
- Gdy weryfikujesz dane na stronie szczegółów bezpośrednio po edycji (przekierowanie już pokazuje nowe dane)
- Gdy test sprawdza tylko UI bez weryfikacji danych z serwera

**Dodatkowe wskazówki**:
- Zawsze czekaj na `networkidle` po `reload()`, aby upewnić się, że wszystkie dane zostały załadowane
- W przypadku testów edycji, rozważ użycie `waitForURL()` z konkretnym URL zamiast ogólnego `waitForSaveNavigation()`, aby upewnić się, że jesteś na właściwej stronie

### 3.4 Testy bezpieczeństwa (Security Tests)

**Cel**: Weryfikacja zabezpieczeń aplikacji i izolacji danych.

**Zakres**:
- Testy RLS (użytkownik A nie widzi danych użytkownika B)
- Testy autoryzacji API routes (401 dla nieautoryzowanych żądań)
- Testy middleware (przekierowanie niezalogowanych użytkowników)
- Testy walidacji danych wejściowych (SQL injection, XSS)
- Testy sesji (wygasanie, odświeżanie)

**Narzędzia**: Vitest, Supabase Test Client, OWASP ZAP (opcjonalnie)

**Priorytet**: Krytyczny

### 3.5 Testy wydajnościowe (Performance Tests)

**Cel**: Weryfikacja wydajności aplikacji pod obciążeniem.

**Zakres**:
- Czas ładowania stron
- Czas odpowiedzi API routes
- Wydajność zapytań do bazy danych
- Renderowanie list z dużą ilością danych (paginacja)
- Optymalizacja obrazów (Next.js Image)

**Narzędzia**: Lighthouse, Web Vitals, k6 (opcjonalnie)

**Priorytet**: Średni

### 3.6 Testy użyteczności (Usability Tests)

**Cel**: Weryfikacja, że aplikacja jest intuicyjna i łatwa w użyciu.

**Zakres**:
- Dostępność (a11y) - ARIA labels, keyboard navigation
- Responsywność (mobile, tablet, desktop)
- Komunikaty błędów (czytelność, pomocność)
- Feedback dla użytkownika (loading states, success messages)
- Obsługa błędów (graceful error handling)

**Narzędzia**: axe-core, Lighthouse Accessibility, manual testing

**Priorytet**: Średni

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Autentykacja

#### TC-AUTH-001: Rejestracja nowego użytkownika
**Priorytet**: Wysoki

**Kroki**:
1. Przejdź na stronę `/register`
2. Wypełnij formularz: email, password, confirmPassword
3. Kliknij "Zarejestruj się"

**Oczekiwany rezultat**:
- Użytkownik zostaje zarejestrowany
- Przekierowanie do `/login` lub automatyczne logowanie
- Email potwierdzający zostaje wysłany (jeśli wymagane)

**Warunki brzegowe**:
- Email już istnieje → komunikat błędu
- Hasło za krótkie (< 6 znaków) → walidacja
- Hasła nie są zgodne → komunikat błędu
- Nieprawidłowy format emaila → walidacja

#### TC-AUTH-002: Logowanie użytkownika
**Priorytet**: Wysoki

**Kroki**:
1. Przejdź na stronę `/login`
2. Wprowadź email i hasło
3. (Opcjonalnie) zaznacz "Zapamiętaj mnie"
4. Kliknij "Zaloguj się"

**Oczekiwany rezultat**:
- Użytkownik zostaje zalogowany
- Przekierowanie do `/exercises` lub strony głównej aplikacji
- Sesja jest zachowana

**Warunki brzegowe**:
- Nieprawidłowe dane → komunikat błędu
- Konto nie istnieje → komunikat błędu
- Sesja wygasła → przekierowanie do `/login`

#### TC-AUTH-003: Reset hasła
**Priorytet**: Wysoki

**Kroki**:
1. Przejdź na stronę `/reset-password`
2. Wprowadź email
3. Kliknij "Wyślij link resetujący"
4. Sprawdź email i kliknij link
5. Wprowadź nowe hasło na stronie `/reset-password/confirm`
6. Potwierdź nowe hasło

**Oczekiwany rezultat**:
- Email z linkiem resetującym zostaje wysłany
- Link prowadzi do formularza resetu hasła
- Hasło zostaje zmienione
- Przekierowanie do `/login` z komunikatem sukcesu

**Warunki brzegowe**:
- Email nie istnieje → komunikat (bez ujawniania, że email nie istnieje)
- Token wygasł → komunikat błędu
- Nieprawidłowy token → komunikat błędu

#### TC-AUTH-004: Ochrona tras wymagających autoryzacji
**Priorytet**: Krytyczny

**Kroki**:
1. Bez logowania, spróbuj przejść na `/exercises`
2. Bez logowania, spróbuj wywołać API `/api/exercises`

**Oczekiwany rezultat**:
- Przekierowanie do `/login` dla stron
- Błąd 401 (UNAUTHORIZED) dla API routes

### 4.2 Biblioteka ćwiczeń

#### TC-EX-001: Tworzenie nowego ćwiczenia
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się jako użytkownik
2. Przejdź na `/exercises`
3. Kliknij "Dodaj ćwiczenie"
4. Wypełnij formularz: title, type, part, reps/duration, series, rest
5. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Ćwiczenie zostaje utworzone
- Powrót do listy ćwiczeń
- Nowe ćwiczenie widoczne na liście

**Warunki brzegowe**:
- Tytuł już istnieje → komunikat błędu "Ćwiczenie o podanym tytule już istnieje"
- Brak wymaganych pól → walidacja
- Nieprawidłowe wartości (ujemne liczby) → walidacja

#### TC-EX-002: Listowanie ćwiczeń z filtrowaniem
**Priorytet**: Średni

**Kroki**:
1. Zaloguj się
2. Przejdź na `/exercises`
3. Użyj filtrów: part (np. "Upper Body"), type (np. "Strength")
4. Użyj sortowania (np. "Tytuł A-Z")

**Oczekiwany rezultat**:
- Lista ćwiczeń jest filtrowana zgodnie z wybranymi kryteriami
- Sortowanie działa poprawnie
- Paginacja działa (jeśli > 20 ćwiczeń)

#### TC-EX-003: Edycja ćwiczenia
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Przejdź do szczegółów ćwiczenia `/exercises/[id]`
3. Kliknij "Edytuj"
4. Zmień dane ćwiczenia
5. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Ćwiczenie zostaje zaktualizowane
- Zmiany są widoczne w szczegółach ćwiczenia

**Warunki brzegowe**:
- Zmiana tytułu na istniejący → komunikat błędu
- Ćwiczenie używane w planie → możliwość edycji (ale z ostrzeżeniem)

#### TC-EX-004: Usuwanie ćwiczenia
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Przejdź do szczegółów ćwiczenia
3. Kliknij "Usuń"
4. Potwierdź usunięcie

**Oczekiwany rezultat**:
- Ćwiczenie zostaje usunięte
- Powrót do listy ćwiczeń

**Warunki brzegowe**:
- Ćwiczenie używane w planie → komunikat błędu "Nie można usunąć ćwiczenia, które jest używane w planach treningowych"
- Ćwiczenie używane w sesji → komunikat błędu

#### TC-EX-005: Izolacja danych ćwiczeń
**Priorytet**: Krytyczny

**Kroki**:
1. Zaloguj się jako Użytkownik A
2. Utwórz ćwiczenie "Test Exercise A"
3. Wyloguj się
4. Zaloguj się jako Użytkownik B
5. Przejdź na `/exercises`

**Oczekiwany rezultat**:
- Użytkownik B nie widzi ćwiczenia "Test Exercise A"
- Lista ćwiczeń Użytkownika B jest pusta lub zawiera tylko jego ćwiczenia

### 4.3 Plany treningowe

#### TC-WP-001: Tworzenie planu treningowego
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Przejdź na `/workout-plans`
3. Kliknij "Utwórz plan"
4. Wypełnij metadane: name, description, part
5. Dodaj ćwiczenia z biblioteki
6. Ustaw parametry planned_* dla każdego ćwiczenia
7. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Plan zostaje utworzony
- Ćwiczenia są przypisane do planu
- Szacowany czas treningu jest obliczony
- Powrót do listy planów

**Warunki brzegowe**:
- Plan bez ćwiczeń → walidacja "Plan musi zawierać co najmniej jedno ćwiczenie"
- Nieprawidłowe parametry → walidacja

#### TC-WP-002: Edycja planu treningowego
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Przejdź do szczegółów planu `/workout-plans/[id]`
3. Kliknij "Edytuj"
4. Zmień dane planu lub ćwiczenia
5. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Plan zostaje zaktualizowany
- Zmiany są widoczne w szczegółach planu

**⚠️ Ważna uwaga dla testów E2E**:
Po edycji planu i nawigacji do listy planów, **zawsze użyj `page.reload()`** przed weryfikacją, że stara nazwa nie istnieje, a nowa istnieje. Next.js może cache'ować dane, co prowadzi do fałszywych negatywów w testach. Zobacz sekcję 3.3.1 dla szczegółów.

### 4.4 Sesje treningowe

#### TC-WS-001: Rozpoczęcie sesji treningowej
**Priorytet**: Krytyczny

**Kroki**:
1. Zaloguj się
2. Utwórz plan treningowy z ćwiczeniami
3. Przejdź na `/workout-sessions/start`
4. Wybierz plan z listy
5. Kliknij "Rozpocznij trening"

**Oczekiwany rezultat**:
- Sesja zostaje utworzona ze statusem "in_progress"
- Przekierowanie do asystenta treningowego `/workout-sessions/[id]/active`
- Ćwiczenia są wyświetlone w kolejności (Warm-up → Main Workout → Cool-down)
- Pierwsze ćwiczenie jest aktywne

**Warunki brzegowe**:
- Plan bez ćwiczeń → komunikat błędu
- Istniejąca sesja in_progress → propozycja wznowienia

#### TC-WS-002: Wykonanie ćwiczenia w sesji
**Priorytet**: Krytyczny

**Kroki**:
1. Rozpocznij sesję treningową
2. Wprowadź faktyczne wykonanie: actual_sets, actual_reps, sets (serie)
3. Kliknij "Next"

**Oczekiwany rezultat**:
- Dane zostają zapisane (autosave)
- Kursor sesji przesuwa się do następnego ćwiczenia
- Następne ćwiczenie jest wyświetlone

**Warunki brzegowe**:
- Puste serie → możliwość pominięcia ćwiczenia
- Nieprawidłowe wartości → walidacja

#### TC-WS-003: Nawigacja w sesji (Previous, Skip)
**Priorytet**: Średni

**Kroki**:
1. W trakcie sesji, przejdź do drugiego ćwiczenia
2. Kliknij "Previous"
3. Wprowadź zmiany w pierwszym ćwiczeniu
4. Kliknij "Next"
5. Kliknij "Skip" na trzecim ćwiczeniu

**Oczekiwany rezultat**:
- Możliwość powrotu do poprzedniego ćwiczenia
- Zmiany są zapisywane
- Pominięte ćwiczenie jest oznaczone jako skipped
- Kursor przesuwa się poprawnie

#### TC-WS-004: Timer sesji treningowej
**Priorytet**: Średni

**Kroki**:
1. Rozpocznij sesję treningową
2. Kliknij "Start" na timerze
3. Poczekaj kilka sekund
4. Kliknij "Pause"
5. Kliknij "Resume"

**Oczekiwany rezultat**:
- Timer liczy czas aktywnego treningu
- Pauza zatrzymuje timer
- Resume wznawia timer
- Czas jest zapisywany w `active_duration_seconds`

#### TC-WS-005: Zakończenie sesji treningowej
**Priorytet**: Wysoki

**Kroki**:
1. Rozpocznij sesję treningową
2. Przejdź przez wszystkie ćwiczenia
3. Po ostatnim ćwiczeniu, kliknij "Next" lub "Zakończ"

**Oczekiwany rezultat**:
- Sesja otrzymuje status "completed"
- `completed_at` jest ustawione
- Przekierowanie do szczegółów sesji lub listy sesji
- Rekordy osobiste są automatycznie przeliczone

#### TC-WS-006: Wznowienie przerwanej sesji
**Priorytet**: Średni

**Kroki**:
1. Rozpocznij sesję treningową
2. Przerwij sesję (wyjście z asystenta lub pause)
3. Przejdź na `/workout-sessions/start`
4. Kliknij "Wznów trening"

**Oczekiwany rezultat**:
- Istniejąca sesja in_progress jest wykryta
- Możliwość wznowienia od miejsca przerwania
- Dane z poprzedniej sesji są zachowane

#### TC-WS-007: Historia sesji treningowych
**Priorytet**: Średni

**Kroki**:
1. Zaloguj się
2. Utwórz i ukończ kilka sesji treningowych
3. Przejdź na `/workout-sessions`
4. Przeglądaj listę sesji
5. Kliknij na sesję, aby zobaczyć szczegóły

**Oczekiwany rezultat**:
- Lista sesji jest wyświetlona z filtrowaniem i sortowaniem
- Szczegóły sesji pokazują porównanie planowanych vs faktycznych wyników
- Set logs są wyświetlone dla każdego ćwiczenia

### 4.5 Rekordy osobiste

#### TC-PR-001: Automatyczne wykrywanie rekordów
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Utwórz ćwiczenie z reps (np. "Push-ups", 10 reps)
3. Utwórz plan i sesję
4. Wykonaj sesję z actual_reps = 12
5. Ukończ sesję
6. Przejdź na `/personal-records`

**Oczekiwany rezultat**:
- Rekord osobisty jest automatycznie wykryty
- Rekord jest widoczny na liście rekordów
- Data osiągnięcia jest zapisana

**Warunki brzegowe**:
- Wykonanie równe planowanemu → brak rekordu (jeśli nie było wcześniejszego)
- Wykonanie gorsze niż poprzedni rekord → brak nowego rekordu

#### TC-PR-002: Listowanie rekordów
**Priorytet**: Średni

**Kroki**:
1. Zaloguj się
2. Utwórz kilka rekordów dla różnych ćwiczeń
3. Przejdź na `/personal-records`

**Oczekiwany rezultat**:
- Lista rekordów jest wyświetlona
- Filtrowanie i sortowanie działa
- Kliknięcie na rekord prowadzi do szczegółów `/personal-records/[exercise_id]`

#### TC-PR-003: Historia rekordów dla ćwiczenia
**Priorytet**: Średni

**Kroki**:
1. Zaloguj się
2. Utwórz kilka sesji z tym samym ćwiczeniem, każda z lepszym wynikiem
3. Przejdź do szczegółów rekordu `/personal-records/[exercise_id]`

**Oczekiwany rezultat**:
- Historia rekordów jest wyświetlona chronologicznie
- Wszystkie rekordy dla danego ćwiczenia są widoczne

### 4.6 Bezpieczeństwo i izolacja danych

#### TC-SEC-001: Row Level Security - izolacja ćwiczeń
**Priorytet**: Krytyczny

**Kroki**:
1. Zaloguj się jako Użytkownik A
2. Utwórz ćwiczenie "Exercise A"
3. Wyloguj się
4. Zaloguj się jako Użytkownik B
5. Spróbuj wywołać API: `GET /api/exercises/[id_exercise_A]`

**Oczekiwany rezultat**:
- Błąd 404 (NOT_FOUND) lub 403 (FORBIDDEN)
- Użytkownik B nie widzi ćwiczenia Użytkownika A

#### TC-SEC-002: Row Level Security - izolacja planów
**Priorytet**: Krytyczny

**Kroki**:
1. Zaloguj się jako Użytkownik A
2. Utwórz plan treningowy "Plan A"
3. Wyloguj się
4. Zaloguj się jako Użytkownik B
5. Spróbuj wywołać API: `GET /api/workout-plans/[id_plan_A]`

**Oczekiwany rezultat**:
- Błąd 404 (NOT_FOUND) lub 403 (FORBIDDEN)
- Użytkownik B nie widzi planu Użytkownika A

#### TC-SEC-003: Row Level Security - izolacja sesji
**Priorytet**: Krytyczny

**Kroki**:
1. Zaloguj się jako Użytkownik A
2. Utwórz i ukończ sesję treningową
3. Wyloguj się
4. Zaloguj się jako Użytkownik B
5. Spróbuj wywołać API: `GET /api/workout-sessions/[id_session_A]`

**Oczekiwany rezultat**:
- Błąd 404 (NOT_FOUND) lub 403 (FORBIDDEN)
- Użytkownik B nie widzi sesji Użytkownika A

#### TC-SEC-004: Autoryzacja API routes
**Priorytet**: Krytyczny

**Kroki**:
1. Bez logowania, wywołaj API: `POST /api/exercises`
2. Bez logowania, wywołaj API: `GET /api/workout-plans`

**Oczekiwany rezultat**:
- Błąd 401 (UNAUTHORIZED) dla wszystkich chronionych endpointów
- Komunikat błędu: "Brak autoryzacji. Zaloguj się ponownie."

#### TC-SEC-005: Walidacja danych wejściowych
**Priorytet**: Wysoki

**Kroki**:
1. Zaloguj się
2. Spróbuj utworzyć ćwiczenie z nieprawidłowymi danymi:
   - SQL injection: `title: "'; DROP TABLE exercises; --"`
   - XSS: `title: "<script>alert('XSS')</script>"`
   - Ujemne wartości: `reps: -5`

**Oczekiwany rezultat**:
- Walidacja Zod odrzuca nieprawidłowe dane
- Komunikaty błędów są wyświetlone
- Dane nie są zapisane w bazie

---

## 5. Środowisko testowe

### 5.1 Środowiska testowe

#### 5.1.1 Środowisko deweloperskie (Development)
- **Lokalne**: `http://localhost:3000`
- **Baza danych**: Lokalna instancja Supabase (Supabase CLI)
- **Cel**: Testy podczas rozwoju
- **Dane**: Testowe dane deweloperskie

#### 5.1.2 Środowisko testowe (Testing/Staging)
- **URL**: Środowisko stagingowe (np. `https://staging.go-girl-workout.vercel.app`)
- **Baza danych**: Dedykowana baza testowa Supabase
- **Cel**: Testy przed wdrożeniem na produkcję
- **Dane**: Zbliżone do produkcyjnych, ale bezpieczne do testowania

#### 5.1.3 Środowisko produkcyjne (Production)
- **URL**: Produkcyjny URL aplikacji
- **Baza danych**: Produkcyjna baza Supabase
- **Cel**: Testy smoke test po wdrożeniu
- **Dane**: Dane produkcyjne (ostrożnie!)

### 5.2 Wymagania środowiskowe

#### 5.2.1 Wymagania sprzętowe
- Node.js 22.19.0 (zgodnie z `.nvmrc`)
- pnpm (zalecane) lub npm/yarn
- Przeglądarka: Chrome, Firefox, Safari (najnowsze wersje)
- System operacyjny: macOS, Linux, Windows

#### 5.2.2 Wymagania oprogramowania
- Supabase CLI (dla lokalnej bazy danych)
- Git (dla kontroli wersji)
- IDE/Editor (VS Code zalecane)

#### 5.2.3 Konfiguracja zmiennych środowiskowych

**Development**:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
```

**Testing/Staging**:
```env
NEXT_PUBLIC_SUPABASE_URL=<staging_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging_anon_key>
```

**Production**:
```env
NEXT_PUBLIC_SUPABASE_URL=<production_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
```

### 5.3 Przygotowanie danych testowych

#### 5.3.1 Seed data dla testów
- Skrypty seed do utworzenia testowych użytkowników
- Testowe ćwiczenia dla różnych kategorii
- Testowe plany treningowe
- Testowe sesje treningowe (completed, in_progress)

#### 5.3.2 Czyszczenie danych testowych
- Skrypty do czyszczenia danych po testach
- Reset bazy danych testowej przed każdą sesją testową

---

## 6. Narzędzia do testowania

### 6.1 Testy jednostkowe i integracyjne

#### 6.1.1 Vitest
- **Wersja**: Najnowsza stabilna
- **Cel**: Framework testowy dla JavaScript/TypeScript
- **Konfiguracja**: `vitest.config.ts`
- **Użycie**: Testy jednostkowe funkcji, serwisów, repozytoriów
- **Zalety**:
  - Szybki i wydajny (oparty na Vite)
  - Natywne wsparcie dla ESM i TypeScript
  - Kompatybilny API z Jest (łatwa migracja)
  - Doskonałe wsparcie dla React Testing Library
  - Watch mode z hot reload
  - Wsparcie dla coverage reports

#### 6.1.2 React Testing Library
- **Wersja**: Najnowsza stabilna
- **Cel**: Testy komponentów React
- **Użycie**: Testy renderowania, interakcji użytkownika, dostępności
- **Integracja**: Pełna kompatybilność z Vitest

#### 6.1.3 @testing-library/react-hooks
- **Wersja**: Najnowsza stabilna
- **Cel**: Testy custom hooks React
- **Użycie**: Testy `use-exercise-form`, `use-workout-plan-form`, itp.
- **Uwaga**: W React 18+ można używać `renderHook` z `@testing-library/react` zamiast osobnej biblioteki

### 6.2 Testy end-to-end

#### 6.2.1 Playwright
- **Wersja**: Najnowsza stabilna
- **Cel**: Testy E2E w przeglądarce
- **Zalety**: 
  - Wsparcie dla wielu przeglądarek (Chromium, Firefox, WebKit)
  - Automatyczne czekanie na elementy (auto-waiting)
  - Screenshots i videos automatycznie przy błędach
  - Wsparcie dla TypeScript out-of-the-box
  - Doskonałe wsparcie dla Next.js (SSR, API routes)
  - Szybkie i niezawodne
  - Trace viewer do debugowania
  - Parallel execution
  - Codegen do generowania testów

### 6.3 Testy bezpieczeństwa

#### 6.3.1 Supabase Test Client
- **Cel**: Testy integracji z Supabase
- **Użycie**: Testy RLS, autoryzacji, zapytań do bazy

#### 6.3.2 OWASP ZAP (Opcjonalnie)
- **Cel**: Automatyczne skanowanie bezpieczeństwa
- **Użycie**: Testy podatności, XSS, SQL injection

### 6.4 Testy wydajnościowe

#### 6.4.1 Lighthouse
- **Cel**: Testy wydajności, dostępności, SEO
- **Użycie**: Integracja z CI/CD, raporty

#### 6.4.2 Web Vitals
- **Cel**: Metryki Core Web Vitals
- **Użycie**: Monitoring w produkcji, testy w staging

#### 6.4.3 k6 (Opcjonalnie)
- **Cel**: Testy obciążeniowe
- **Użycie**: Testy API pod obciążeniem

### 6.5 Testy dostępności

#### 6.5.1 axe-core
- **Cel**: Automatyczne testy dostępności
- **Użycie**: Integracja z Vitest/Playwright

#### 6.5.2 Lighthouse Accessibility
- **Cel**: Audyt dostępności
- **Użycie**: Raporty dostępności

### 6.6 Narzędzia pomocnicze

#### 6.6.1 MSW (Mock Service Worker)
- **Cel**: Mockowanie API calls w testach
- **Użycie**: Testy jednostkowe bez rzeczywistej bazy danych

#### 6.6.2 @supabase/supabase-js (Test Client)
- **Cel**: Klient Supabase do testów
- **Użycie**: Testy integracyjne z bazą danych

---

## 7. Harmonogram testów

### 7.1 Fazy testowania

#### Faza 1: Testy jednostkowe 
- **Cel**: Pokrycie testami jednostkowymi kluczowych funkcji
- **Zakres**:
  - Funkcje walidacji (Zod schemas)
  - Funkcje pomocnicze (utils)
  - Funkcje obliczeniowe
  - Komponenty UI (shadcn/ui)
  - Custom hooks

**Metryki**:
- Pokrycie kodu: minimum 70%
- Priorytet: funkcje biznesowe (services, repositories)
- **Narzędzie**: Vitest Coverage

#### Faza 2: Testy integracyjne 
- **Cel**: Weryfikacja współpracy między komponentami
- **Zakres**:
  - API routes + services
  - Services + repositories
  - Komponenty + hooks
  - Integracja z Supabase

**Metryki**:
- Wszystkie API routes przetestowane
- Integracja z bazą danych zweryfikowana

#### Faza 3: Testy bezpieczeństwa 
- **Cel**: Weryfikacja zabezpieczeń i izolacji danych
- **Zakres**:
  - Testy RLS
  - Testy autoryzacji
  - Testy walidacji danych wejściowych

**Metryki**:
- 100% pokrycia testami bezpieczeństwa
- Wszystkie scenariusze bezpieczeństwa przetestowane

#### Faza 4: Testy end-to-end 
- **Cel**: Weryfikacja pełnych przepływów użytkownika
- **Zakres**:
  - Przepływ rejestracji i logowania
  - Przepływ tworzenia ćwiczenia i planu
  - Przepływ sesji treningowej
  - Przepływ przeglądania historii

**Metryki**:
- Wszystkie kluczowe przepływy przetestowane
- Minimum 10 scenariuszy E2E

#### Faza 5: Testy wydajnościowe i użyteczności 
- **Cel**: Weryfikacja wydajności i dostępności
- **Zakres**:
  - Testy Lighthouse
  - Testy dostępności
  - Testy responsywności

**Metryki**:
- Lighthouse score: minimum 90 dla Performance, Accessibility, Best Practices
- Wszystkie strony responsywne

### 7.2 Testy ciągłe (CI/CD)

#### 7.2.1 Testy automatyczne w GitHub Actions
- **Trigger**: Przy każdym PR i push do main
- **Zakres**:
  - Testy jednostkowe
  - Testy integracyjne
  - Linting (ESLint)
  - Type checking (TypeScript)
  - Build verification

#### 7.2.2 Testy przed wdrożeniem
- **Trigger**: Przed deploymentem na staging/produkcję
- **Zakres**:
  - Smoke tests
  - Testy bezpieczeństwa
  - Testy E2E (krytyczne scenariusze)

### 7.3 Testy regresyjne

#### 7.2.1 Po każdej zmianie
- Testy jednostkowe i integracyjne dla zmienionych modułów
- Testy E2E dla zmienionych przepływów

#### 7.2.2 Przed release
- Pełna suita testów regresyjnych
- Testy wszystkich kluczowych funkcjonalności

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria ogólne

#### 8.1.1 Pokrycie kodu
- **Minimum**: 70% pokrycia kodu testami jednostkowymi
- **Priorytet**: 90%+ dla funkcji biznesowych (services, repositories)
- **Narzędzie**: Vitest Coverage Report

#### 8.1.2 Wskaźniki jakości
- **Błędy krytyczne**: 0
- **Błędy wysokie**: 0
- **Błędy średnie**: Maksymalnie 5 (z planem naprawy)
- **Błędy niskie**: Dozwolone (z priorytetyzacją)

#### 8.1.3 Wydajność
- **Lighthouse Performance**: Minimum 90
- **Lighthouse Accessibility**: Minimum 90
- **Lighthouse Best Practices**: Minimum 90
- **Core Web Vitals**: Wszystkie w zielonej strefie

### 8.2 Kryteria dla poszczególnych modułów

#### 8.2.1 Autentykacja
- ✅ Wszystkie scenariusze logowania/rejestracji działają
- ✅ Reset hasła działa end-to-end
- ✅ Middleware chroni wszystkie chronione trasy
- ✅ Sesje są poprawnie zarządzane

#### 8.2.2 Biblioteka ćwiczeń
- ✅ CRUD działa poprawnie
- ✅ Walidacja działa dla wszystkich pól
- ✅ Izolacja danych jest zachowana (RLS)
- ✅ Filtrowanie i sortowanie działa

#### 8.2.3 Plany treningowe
- ✅ Tworzenie planów z ćwiczeniami działa
- ✅ Edycja planów działa
- ✅ Szacowanie czasu jest poprawne
- ✅ Izolacja danych jest zachowana

#### 8.2.4 Sesje treningowe
- ✅ Rozpoczynanie sesji działa
- ✅ Autosave działa poprawnie
- ✅ Timer działa
- ✅ Nawigacja między ćwiczeniami działa
- ✅ Zakończenie sesji aktualizuje status
- ✅ Rekordy osobiste są automatycznie wykrywane

#### 8.2.5 Rekordy osobiste
- ✅ Automatyczne wykrywanie rekordów działa
- ✅ Listowanie rekordów działa
- ✅ Historia rekordów jest poprawna

#### 8.2.6 Bezpieczeństwo
- ✅ RLS działa dla wszystkich tabel
- ✅ Użytkownicy nie widzą danych innych użytkowników
- ✅ API routes zwracają 401 dla nieautoryzowanych żądań
- ✅ Walidacja danych wejściowych działa

### 8.3 Kryteria akceptacji dla release

Przed wydaniem wersji na produkcję, wszystkie poniższe kryteria muszą być spełnione:

- ✅ Wszystkie testy jednostkowe przechodzą (100%)
- ✅ Wszystkie testy integracyjne przechodzą (100%)
- ✅ Wszystkie testy E2E (krytyczne scenariusze) przechodzą (100%)
- ✅ Testy bezpieczeństwa przechodzą (100%)
- ✅ Lighthouse scores: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90
- ✅ Brak błędów krytycznych i wysokich
- ✅ Dokumentacja testów jest aktualna
- ✅ Testy regresyjne przechodzą (100%)

---

## 9. Role i odpowiedzialności w procesie testowania

### 9.1 Role w zespole

#### 9.1.1 Developer
- **Odpowiedzialność**:
  - Pisanie testów jednostkowych dla nowych funkcji
  - Utrzymanie istniejących testów jednostkowych
  - Naprawa testów po zmianach w kodzie
  - Code review testów innych developerów

#### 9.1.2 QA Engineer (jeśli dostępny)
- **Odpowiedzialność**:
  - Tworzenie i utrzymanie testów E2E
  - Testy manualne (exploratory testing)
  - Testy bezpieczeństwa
  - Testy wydajnościowe
  - Raportowanie błędów
  - Weryfikacja napraw błędów

#### 9.1.3 Tech Lead / Senior Developer
- **Odpowiedzialność**:
  - Przegląd planu testów
  - Ustalenie priorytetów testów
  - Decyzje o kryteriach akceptacji
  - Code review testów (szczególnie integracyjnych i E2E)

#### 9.1.4 Product Owner
- **Odpowiedzialność**:
  - Weryfikacja, że testy pokrywają wymagania biznesowe
  - Akceptacja testów użyteczności
  - Priorytetyzacja napraw błędów

### 9.2 Proces testowania

#### 9.2.1 Przed rozpoczęciem implementacji
1. Developer przegląda wymagania
2. Developer identyfikuje przypadki testowe
3. Developer tworzy testy jednostkowe (TDD - opcjonalnie)

#### 9.2.2 Podczas implementacji
1. Developer pisze kod i testy równolegle
2. Developer uruchamia testy lokalnie
3. Developer naprawia błędy wykryte przez testy

#### 9.2.3 Przed merge do main
1. Developer tworzy PR
2. GitHub Actions uruchamia automatyczne testy
3. Code review (w tym przegląd testów)
4. Wszystkie testy muszą przechodzić przed merge

#### 9.2.4 Po merge do main
1. Automatyczne testy w CI/CD
2. Deployment na staging (jeśli testy przechodzą)
3. Testy E2E na staging
4. Testy smoke test przed produkcją

---

## 10. Procedury raportowania błędów

### 10.1 Szablon raportu błędu

Każdy znaleziony błąd powinien być zgłoszony z następującymi informacjami:

#### 10.1.1 Podstawowe informacje
- **Tytuł**: Krótki, opisowy tytuł błędu
- **Priorytet**: Krytyczny / Wysoki / Średni / Niski
- **Kategoria**: Funkcjonalność / Bezpieczeństwo / Wydajność / Użyteczność / Inne
- **Moduł**: Autentykacja / Ćwiczenia / Plany / Sesje / Rekordy / Inne
- **Środowisko**: Development / Staging / Production
- **Przeglądarka**: Chrome / Firefox / Safari / Edge (jeśli dotyczy)

#### 10.1.2 Opis błędu
- **Kroki do odtworzenia**: 
  1. Krok 1
  2. Krok 2
  3. ...
- **Oczekiwany rezultat**: Co powinno się wydarzyć
- **Rzeczywisty rezultat**: Co się faktycznie wydarzyło
- **Częstotliwość**: Zawsze / Czasami / Raz

#### 10.1.3 Dodatkowe informacje
- **Screenshots/Videos**: Jeśli dotyczy
- **Logi konsoli**: Błędy JavaScript
- **Logi sieci**: Błędy API (Network tab)
- **Stack trace**: Jeśli dostępny
- **Dane testowe**: Używane dane testowe

### 10.2 Priorytetyzacja błędów

#### 10.2.1 Krytyczny
- **Definicja**: Błąd uniemożliwiający użycie aplikacji lub powodujący utratę danych
- **Przykłady**:
  - Aplikacja się nie uruchamia
  - Nie można się zalogować
  - Utrata danych użytkownika
  - Naruszenie bezpieczeństwa (np. użytkownik widzi dane innego użytkownika)
- **Czas naprawy**: Natychmiast (w ciągu 24 godzin)

#### 10.2.2 Wysoki
- **Definicja**: Błąd wpływający na kluczowe funkcjonalności
- **Przykłady**:
  - Nie można utworzyć ćwiczenia
  - Nie można rozpocząć sesji treningowej
  - Błędne obliczenia rekordów osobistych
- **Czas naprawy**: W ciągu 3 dni

#### 10.2.3 Średni
- **Definicja**: Błąd wpływający na funkcjonalności pomocnicze
- **Przykłady**:
  - Filtrowanie nie działa poprawnie
  - Nieprawidłowe komunikaty błędów
  - Problemy z UI (ale funkcjonalność działa)
- **Czas naprawy**: W ciągu 1 tygodnia

#### 10.2.4 Niski
- **Definicja**: Błąd kosmetyczny lub wpływający na funkcjonalności o niskim priorytecie
- **Przykłady**:
  - Drobne problemy z layoutem
  - Literówki w tekstach
  - Sugestie ulepszeń
- **Czas naprawy**: W ciągu 2 tygodni lub w następnym sprint

### 10.3 Narzędzia do raportowania

#### 10.3.1 GitHub Issues (Zalecane)
- **Zalety**: 
  - Integracja z repozytorium
  - Łatwe śledzenie
  - Możliwość przypisania do PR
- **Szablon**: Utworzenie szablonu issue dla raportów błędów

#### 10.3.2 Alternatywy
- Jira (jeśli zespół używa)
- Linear
- Inne narzędzia do zarządzania projektem

### 10.4 Proces naprawy błędów

#### 10.4.1 Po zgłoszeniu błędu
1. Developer/Tech Lead weryfikuje błąd
2. Błąd jest przypisany do odpowiedniego developera
3. Developer tworzy branch do naprawy: `fix/issue-XXX-description`
4. Developer naprawia błąd i dodaje testy (jeśli brakuje)
5. Developer tworzy PR z opisem naprawy
6. Code review
7. Testy przechodzą
8. Merge do main
9. Błąd jest oznaczony jako naprawiony
10. Weryfikacja naprawy przez zgłaszającego (jeśli to QA)

#### 10.4.2 Weryfikacja naprawy
- Developer uruchamia testy lokalnie
- Testy automatyczne w CI/CD przechodzą
- Testy manualne (jeśli dotyczy)
- Weryfikacja na środowisku staging

---

## 11. Metryki i raportowanie

### 11.1 Metryki testów

#### 11.1.1 Pokrycie kodu
- **Cel**: Minimum 70% pokrycia
- **Narzędzie**: Vitest Coverage Report
- **Częstotliwość raportowania**: Po każdym PR

#### 11.1.2 Liczba testów
- **Testy jednostkowe**: Śledzenie liczby testów jednostkowych
- **Testy integracyjne**: Śledzenie liczby testów integracyjnych
- **Testy E2E**: Śledzenie liczby testów E2E
- **Trend**: Wzrost liczby testów wraz z rozwojem aplikacji

#### 11.1.3 Czas wykonania testów
- **Testy jednostkowe**: < 30 sekund
- **Testy integracyjne**: < 2 minuty
- **Testy E2E**: < 10 minut
- **Całkowity czas CI/CD**: < 15 minut

#### 11.1.4 Wskaźnik powodzenia testów
- **Cel**: 100% testów przechodzi
- **Śledzenie**: Liczba nieudanych testów w czasie

### 11.2 Raportowanie

#### 11.2.1 Raporty automatyczne
- **GitHub Actions**: Raporty z każdego uruchomienia testów
- **Coverage Reports**: Automatyczne generowanie po każdym PR
- **Lighthouse Reports**: Automatyczne raporty wydajności

#### 11.2.2 Raporty okresowe
- **Tygodniowy przegląd**: Przegląd metryk testów
- **Miesięczny raport**: Raport o jakości i pokryciu testami
- **Przed release**: Pełny raport testów przed wydaniem

---

## 12. Utrzymanie planu testów

### 12.1 Aktualizacja planu

Plan testów powinien być aktualizowany:
- Po dodaniu nowych funkcjonalności
- Po zmianach w architekturze
- Po zmianach w wymaganiach
- Co najmniej raz na kwartał (przegląd okresowy)

### 12.2 Wersjonowanie

Plan testów powinien być wersjonowany:
- **Format**: `v1.0`, `v1.1`, `v2.0`, itd.
- **Historia zmian**: Dokumentacja zmian w planie
- **Data ostatniej aktualizacji**: Widoczna w dokumencie

### 12.3 Feedback i ulepszenia

- Zespół może proponować ulepszenia planu testów
- Feedback jest zbierany podczas retrospektyw
- Plan jest aktualizowany na podstawie doświadczeń z testowania

---

## 13. Załączniki

### 13.1 Przydatne linki

- [Dokumentacja Next.js](https://nextjs.org/docs)
- [Dokumentacja Supabase](https://supabase.com/docs)
- [Dokumentacja Vitest](https://vitest.dev/)
- [Dokumentacja Playwright](https://playwright.dev/docs/intro)
- [Dokumentacja React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### 13.2 Przykładowe konfiguracje

#### 13.2.1 Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### 13.2.2 Vitest Setup File
```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

#### 13.2.2 Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 14. Podsumowanie

Niniejszy plan testów stanowi kompleksowy przewodnik po procesie testowania aplikacji **Go Girl Workout App**. Plan jest dostosowany do specyfiki projektu wykorzystującego Next.js 16, React 19, TypeScript 5, Supabase i inne nowoczesne technologie.

Kluczowe elementy planu:
- **Priorytetyzacja**: Testy bezpieczeństwa i kluczowych funkcjonalności mają najwyższy priorytet
- **Kompleksowość**: Plan obejmuje testy jednostkowe, integracyjne, E2E, bezpieczeństwa, wydajności i użyteczności
- **Praktyczność**: Scenariusze testowe są szczegółowe i gotowe do użycia
- **Utrzymywalność**: Plan jest zaprojektowany tak, aby był łatwy w utrzymaniu i aktualizacji

Plan powinien być traktowany jako żywy dokument, który ewoluuje wraz z rozwojem aplikacji. Regularne przeglądy i aktualizacje zapewnią, że plan pozostaje aktualny i użyteczny.

---

**Wersja dokumentu**: 1.2  
**Data utworzenia**: 2025-01-XX  
**Ostatnia aktualizacja**: 2025-01-26  
**Autor**: Zespół Go Girl Workout App

**Zmiany w wersji 1.2**:
- Dodano sekcję 3.3.1 z ważnymi uwagami dotyczącymi cache'owania danych w testach E2E
- Dodano adnotację w TC-WP-002 o konieczności użycia `page.reload()` po edycji planu
- Dokumentacja problemu z cache'owaniem danych i jego rozwiązania dla przyszłych testów

**Zmiany w wersji 1.1**:
- Zaktualizowano narzędzia testowe: Vitest dla testów jednostkowych zamiast Jest
- Potwierdzono Playwright jako główne narzędzie do testów E2E
- Zaktualizowano przykładowe konfiguracje (Vitest zamiast Jest)
- Dodano szczegóły dotyczące zalet Vitest i Playwright
