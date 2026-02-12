# E2E Scenarios

Pełna, numerowana lista scenariuszy E2E aktualnie obecnych w aplikacji.

## Auth

1. `E2E-AUTH-001`  
Ładowanie strony logowania.  
Plik: `e2e/auth/login.spec.ts`

2. `E2E-AUTH-002`  
Widoczność wszystkich wymaganych pól formularza logowania.  
Plik: `e2e/auth/login.spec.ts`

3. `E2E-AUTH-003`  
Poprawne logowanie przy poprawnych danych i przekierowanie do strefy chronionej.  
Plik: `e2e/auth/login.spec.ts`

4. `E2E-AUTH-004`  
Stan ładowania podczas wysyłania formularza logowania.  
Plik: `e2e/auth/login.spec.ts`

5. `E2E-AUTH-005`  
Logowanie przez helper `authenticateUser`.  
Plik: `e2e/auth/login.spec.ts`

## Exercises

1. `E2E-EX-001`  
Dodanie nowego ćwiczenia.  
Plik: `e2e/exercises/add-exercise.spec.ts`

2. `E2E-EX-002`  
Dodanie i późniejsza edycja ćwiczenia.  
Plik: `e2e/exercises/add-exercise.spec.ts`

## Workout Plans

1. `E2E-WP-001`  
Utworzenie planu treningowego z ćwiczeniami.  
Plik: `e2e/workout-plans/create-workout-plan.spec.ts`

2. `E2E-WP-002`  
Pełny flow: utworzenie planu z ćwiczeń, potem edycja i zapis zmian.  
Plik: `e2e/workout-plans/workout-plan.spec.ts`

3. `E2E-WP-003`  
Walidacja edge case: plan nie może być zapisany bez ćwiczeń (`TC-WP-001`).  
Plik: `e2e/workout-plans/workout-plan.spec.ts`

4. `E2E-WP-004`  
Weryfikacja, że zmiany po edycji są widoczne w szczegółach planu (`TC-WP-002`).  
Plik: `e2e/workout-plans/workout-plan.spec.ts`

5. `E2E-WP-005`  
Tworzenie planu z wieloma ćwiczeniami i weryfikacja zapisu wszystkich pozycji.  
Plik: `e2e/workout-plans/workout-plan.spec.ts`

## Scope (Workout Plan Edit)

1. `E2E-SCOPE-001`  
Regresja: zapis po zmianie kolejności scope i kolejności ćwiczeń w scope.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

2. `E2E-SCOPE-002`  
Regresja: układ `single + scope + single`, ruch scope `up/down`, reorder w scope, zapis.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

3. `E2E-SCOPE-003`  
Regresja: zmiana `section_type` dla ćwiczeń scope i zapis planu.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

## Workout Sessions

1. `E2E-WS-001`  
Pełny flow sesji: start z planu -> asystent -> zakończenie -> widok completed.  
Plik: `e2e/workout-sessions/workout-session-flow.spec.ts`

2. `E2E-WS-002`  
Szybkie zakończenie flow sesji z użyciem `Skip`.  
Plik: `e2e/workout-sessions/workout-session-flow.spec.ts`

3. `E2E-WS-003`  
Flow sesji z użyciem przycisków timera (`OK` / `Pomiń przerwę`).  
Plik: `e2e/workout-sessions/workout-session-flow.spec.ts`

## Statistics + I18N

1. `E2E-STAT-000`  
Prywatność ścieżki statistics: niezalogowany użytkownik trafia na `/login`.  
Plik: `e2e/statistics/statistics.spec.ts`

2. `E2E-STAT-100`  
Użycie strony statistics przez zalogowanego: widok, nawigacja miesiąca, przełącznik języka.  
Plik: `e2e/statistics/statistics.spec.ts`

3. `E2E-STAT-001`  
Otwarcie modala szczegółów sesji z kalendarza statistics.  
Plik: `e2e/statistics/statistics.spec.ts`

4. `E2E-STAT-002`  
Akcja `repeat plan` z modala statistics i przejście do aktywnej sesji.  
Plik: `e2e/statistics/statistics.spec.ts`

5. `E2E-I18N-001`  
Trwałość wybranego języka po reloadzie i po nawigacji między stronami.  
Plik: `e2e/statistics/statistics.spec.ts`
