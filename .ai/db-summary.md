<conversation_summary>
<decisions>

1. Model relacyjny dla set logs: `workout_session_exercises` + `workout_session_sets` (nie JSONB)
2. PR materializowane w tabeli `personal_records` z trzema typami metryk: `total_reps` (suma ze wszystkich serii), `max_duration` (maksimum z pojedynczej serii), `max_weight` (maksimum z pojedynczej serii)
3. `planned_*` i `actual_*` jako jawne kolumny (NULL-owalne) z CHECK constraints, nie JSON
4. Skip zapisuje `actual_reps = 0` lub `actual_duration = 0`, bez tworzenia wierszy w `workout_session_sets`
5. Snapshotowanie danych w sesji: `plan_name_at_time`, `exercise_title_at_time`, `exercise_type_at_time`, `exercise_part_at_time` oraz parametry planu
6. Partial unique index: `unique(user_id) where status='in_progress'` na `workout_sessions`
7. `title_normalized` jako generated column lub kolumna utrzymywana triggerem z `unique(user_id, title_normalized)`
8. Blokada usuwania ćwiczenia tylko jeśli występuje w `workout_sessions` lub `personal_records` (FK RESTRICT); usunięcie z planu nie blokuje usunięcia ćwiczenia
9. Kolejność ćwiczeń w planie: `section_type` (Warm-up/Main/Cool-down) + `section_position` w `workout_plan_exercises` z `unique(plan_id, section_type, section_position)`
10. Jednostki w bazie: `duration_seconds int`, `rest_seconds int`, `weight_kg numeric(6,2)` z CHECK constraints (>= 0)
11. Walidacja metryk: ćwiczenie ma `reps` LUB `duration` (nie oba), opcjonalnie `weight`; spójność metryk w ramach ćwiczenia w sesji
12. `current_position` i `last_action_at` w `workout_sessions` dla śledzenia wznowienia
13. Funkcje RPC (SECURITY DEFINER) dla złożonych operacji: `save_workout_session_exercise`, `recalculate_pr_for_exercise`, `check_and_increment_ai_usage`
14. Tabela `ai_usage` z `month_year date` i `unique(user_id, month_year)` dla limitu 5/miesiąc
15. Tabela `ai_requests` z pełnym logiem (request/response JSON, error codes, timestamps)
16. Enumy PostgreSQL: `exercise_type`, `exercise_part`, `workout_session_status`, `pr_metric_type`
17. `actual_*` kopiowane z `planned_*` przy starcie sesji jako wartości domyślne
18. Migracje przez Supabase migrations w folderze `supabase/migrations/`
    </decisions>

<matched_recommendations>

1. Model relacyjny zamiast JSONB dla set logs — ułatwia liczenie PR, walidacje i indeksowanie
2. Materializacja PR w osobnej tabeli z automatycznym przeliczaniem przez funkcje RPC — zapewnia szybkie wyświetlanie i deterministyczne przeliczenia
3. Snapshotowanie danych w sesji — zapewnia stabilność historii mimo zmian w ćwiczeniach/planach
4. Partial unique index dla jednej sesji in_progress — zabezpiecza logikę na poziomie bazy
5. CHECK constraints dla walidacji metryk — zapewnia spójność danych i prostotę zapytań
6. RLS "owner-only" dla tabel domenowych + RPC dla złożonych operacji — zapewnia bezpieczeństwo i atomowość
7. Enumy PostgreSQL zamiast CHECK constraints dla wartości stałych — zapewnia walidację na poziomie DB i czytelność
8. Indeksy strategiczne: `exercises(user_id, title_normalized)`, `workout_plans(user_id, created_at)`, `workout_sessions(user_id, started_at desc)`, `personal_records(user_id, exercise_id, metric_type)`
9. FK RESTRICT dla blokady usuwania ćwiczeń z historią — zapewnia integralność danych
10. Funkcja `recalculate_pr_for_exercise` z `INSERT ... ON CONFLICT DO UPDATE` — zapewnia atomowość i unika race conditions
    </matched_recommendations>

<database_planning_summary>

## Główne wymagania dotyczące schematu bazy danych

### Architektura i bezpieczeństwo

- **Supabase PostgreSQL** jako backend z wbudowaną autentykacją
- **Row-Level Security (RLS)** dla wszystkich tabel domenowych z filtrem `user_id = auth.uid()`
- **Funkcje RPC (SECURITY DEFINER)** dla złożonych operacji wymagających atomowości i kontroli limitów
- **Endpointy Next.js** dla walidacji JSON i integracji z OpenRouter

### Kluczowe encje i relacje

1. **`exercises`** — prywatna biblioteka ćwiczeń użytkownika

   - Unikalność: `unique(user_id, title_normalized)`
   - Walidacja: `reps` LUB `duration` (nie oba), wymagane serie i odpoczynek
   - Blokada usuwania: FK RESTRICT jeśli powiązane z sesjami/PR

2. **`workout_plans`** — szablony treningowe

   - Metadane: `name`, `description`, `part`
   - Relacja 1:N z `workout_plan_exercises`

3. **`workout_plan_exercises`** — ćwiczenia w planie

   - Kolejność: `section_type` (Warm-up/Main/Cool-down) + `section_position`
   - Parametry planu: `planned_sets`, `planned_reps`, `planned_duration`, `planned_rest`
   - `unique(plan_id, section_type, section_position)`

4. **`workout_sessions`** — sesje treningowe

   - Status: `in_progress` / `completed` (enum)
   - Ograniczenie: `unique(user_id) where status='in_progress'`
   - Śledzenie wznowienia: `current_position`, `last_action_at`
   - Snapshot planu: `plan_name_at_time` (ON DELETE SET NULL dla `workout_plan_id`)

5. **`workout_session_exercises`** — ćwiczenia w sesji

   - Snapshot ćwiczenia: `exercise_title_at_time`, `exercise_type_at_time`, `exercise_part_at_time`
   - Parametry: `planned_*` (skopiowane z planu) i `actual_*` (domyślnie z `planned_*`, edytowalne)
   - Skip: `actual_reps = 0` lub `actual_duration = 0`

6. **`workout_session_sets`** — serie w ćwiczeniu

   - Metryki: `reps` LUB `duration` (spójne w ramach ćwiczenia), opcjonalnie `weight`
   - Walidacja: co najmniej jedna metryka niepusta
   - Jednostki: `duration_seconds`, `weight_kg`

7. **`personal_records`** — materializowane rekordy

   - Typy metryk: `total_reps` (suma ze wszystkich serii), `max_duration`, `max_weight` (maksimum z pojedynczej serii)
   - `unique(user_id, exercise_id, metric_type)`
   - Automatyczne przeliczanie przez `recalculate_pr_for_exercise()`
   - Metadane: `achieved_at`, `achieved_in_session_id`, `achieved_in_set_number`

8. **`ai_usage`** — limit użycia AI (5/miesiąc)

   - `unique(user_id, month_year)`
   - Reset automatyczny 1. dnia miesiąca

9. **`ai_requests`** — pełny log wywołań AI
   - Pola: `request_type`, `input_params jsonb`, `response_json jsonb`, `error_code`, `is_system_error`
   - Przechowywanie bezterminowe (dla debugowania)

### Ważne kwestie bezpieczeństwa i skalowalności

**Bezpieczeństwo:**

- RLS na wszystkich tabelach domenowych (`user_id = auth.uid()`)
- Funkcje RPC dla operacji wymagających atomowości (zapis sesji, przeliczenie PR, limit AI)
- Walidacja JSON po stronie serwera dla odpowiedzi AI
- Brak PII w payloadach do AI

**Skalowalność:**

- Indeksy strategiczne dla najczęstszych zapytań
- Materializacja PR zamiast obliczeń w locie
- Architektura gotowa na paginację (choć nie wymagana w MVP)
- Partycjonowanie nie wymagane dla ~5 użytkowników

**Integralność danych:**

- CHECK constraints dla walidacji metryk i wymagań biznesowych
- FK RESTRICT dla blokady usuwania powiązanych danych
- Snapshotowanie danych w sesji dla stabilności historii
- Transakcyjne przeliczanie PR

**Wydajność:**

- Indeksy na kluczowych kolumnach (`user_id`, `exercise_id`, `metric_type`, `started_at`)
- Partial unique index dla sesji in_progress
- Generated column dla `title_normalized` (szybkie wyszukiwanie)

</database_planning_summary>

<unresolved_issues>

1. **Dokładna implementacja funkcji RPC**: Wymagane są szczegóły implementacyjne dla `save_workout_session_exercise`, `recalculate_pr_for_exercise` i `check_and_increment_ai_usage` (logika transakcyjna, obsługa błędów, walidacje wejściowe).

2. **Trigger vs funkcja wywoływana ręcznie**: Należy zdecydować, czy przeliczenie PR ma być automatyczne (trigger na `workout_session_sets`) czy wywoływane ręcznie przez aplikację po zapisie.

3. **Obsługa edge cases w PR**: Sytuacje brzegowe, np. gdy wszystkie serie mają wartość 0, gdy ćwiczenie ma tylko jedną serię, gdy metryki są mieszane (choć zablokowane walidacją).

4. **Polityka archiwizacji danych**: Długoterminowe przechowywanie logów AI, historia sesji (czy archiwizować ukończone sesje starsze niż X miesięcy), soft delete vs hard delete.

5. **Backup i recovery**: Strategia backupów dla Supabase, testowanie przywracania danych, RPO/RTO dla MVP.

6. **Testowanie schematu**: Strategia testów jednostkowych dla funkcji RPC, testy integracyjne dla RLS, testy wydajnościowe dla zapytań PR.

7. **Monitoring i alerty**: Jakie metryki monitorować (błędy RPC, przekroczenia limitów AI, problemy z przeliczaniem PR), integracja z systemami monitoringu.

</unresolved_issues>

</conversation_summary>
