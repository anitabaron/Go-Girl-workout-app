# API Endpoint Implementation Plan: Exercises (CRUD)

## 1. Przegląd punktu końcowego

- Zapewnienie CRUD dla zasobu `exercises` powiązanego z zalogowanym użytkownikiem.
- Wsparcie filtrowania, sortowania i paginacji kursorem.
- Silna walidacja domenowa: wyłączność metryk (reps XOR duration), wymagane serie, wymagany co najmniej jeden typ odpoczynku, unikalny tytuł per użytkownik (case-insensitive).
- Zgodność z Supabase (auth + Postgres), Next.js App Router API routes, Zod do walidacji.

## 2. Szczegóły żądania

- **HTTP Methods & URL**
  - `POST /api/exercises`
  - `GET /api/exercises`
  - `GET /api/exercises/{id}`
  - `PATCH /api/exercises/{id}`
  - `DELETE /api/exercises/{id}`
- **Parametry**
  - Wymagane (POST): `title`, `type`, `part`, `series` oraz (exactly one) `reps | duration_seconds`; co najmniej jedno z `rest_in_between_seconds | rest_after_series_seconds`.
  - Opcjonalne (POST): `level`, `details`, brakujący z pary odpoczynku jeśli drugi podany.
  - Wymagane (PATCH): `id` w ścieżce, body częściowe zgodne z create, zachowanie reguł XOR/rest.
  - Wymagane (GET one/delete): `id` w ścieżce.
  - Opcjonalne (GET list query): `search`, `part`, `type`, `sort` ∈ {`created_at`, `title`, `part`, `type`}, `order` ∈ {`asc`,`desc`}, `limit`, `cursor`.
- **Body Schemas (DTO/Commands)**
  - `ExerciseCreateCommand` (z `src/types.ts`) dla POST.
  - `ExerciseUpdateCommand` (Partial) dla PATCH.
  - `ExerciseQueryParams` dla listingu.
  - `ExerciseDTO` dla odpowiedzi (bez `user_id`, `title_normalized`).

## 3. Szczegóły odpowiedzi

- **POST**: `201` + `ExerciseDTO` utworzonego zasobu.
- **GET list**: `200` + `{ items: ExerciseDTO[]; nextCursor?: string | null }`.
- **GET one**: `200` + `ExerciseDTO`.
- **PATCH**: `200` + zaktualizowany `ExerciseDTO`.
- **DELETE**: `204` bez body.
- **Błędy**: `400` walidacja/parametry, `401` brak sesji, `403` (jeśli RLS wróci perm error), `404` zasób nie należy do użytkownika/nie istnieje, `409` konflikt tytułu lub FK RESTRICT, `500` nieoczekiwane.

## 4. Przepływ danych

- Pobierz sesję użytkownika przez Supabase auth (server-side client). Wymuś obecność `user.id`.
- Waliduj dane wejściowe Zod-em (body lub query).
- Dla listy: zbuduj filtr `where user_id = session.user.id`, opcjonalne filtry `part/type`, `search` jako ILIKE na `title` lub `title_normalized`; `sort/order` whitelist; `limit` z bezpiecznym max (np. 50); `cursor` jako UUID/timestamp bazujący na `created_at` lub id (spójny z sortowaniem). Pobierz `limit + 1` dla nextCursor.
- Dla create: enforce XOR reps/duration i co najmniej jeden rest, `series > 0`, rest >= 0, normalizuj tytuł (DB generated, ale duplikat sprawdź pre/post). Insert z `user_id` z sesji. Zwróć `ExerciseDTO`.
- Dla read/update/delete by id: najpierw select po `id`+`user_id` (wspiera brak RLS). Przy update stosuj partial merge, powtórz walidacje XOR/rest, obsłuż konflikt tytułu. Delete z propagacją błędów FK.
- Obsługa konfliktów: `unique_violation` → `409`; `foreign_key_violation` przy delete/update → `409`; brak rekordu → `404`.
- Logowanie błędów: przy `500` loguj przez centralny logger (np. `console.error` serwerowy + opcjonalnie Supabase table `error_logs` jeśli istnieje; dodać TODO).

## 5. Względy bezpieczeństwa

- Uwierzytelnienie: wymagaj aktywnej sesji Supabase dla wszystkich operacji.
- Autoryzacja: filtrowanie po `user_id` w każdej operacji; nie ujawniaj istnienia cudzych zasobów (`404` zamiast `403` po sprawdzeniu właściciela).
- Walidacja: Zod schemas z whitelistą pól; odrzuć nieznane pola. Limity dla `limit` (np. max 50) i długości `search` (np. max 100).
- Ochrona przed enumeration: brak rozróżnienia `404/403` po sprawdzeniu własności.
- Dane wejściowe: sanity-check wartości liczbowych (>=0/>0), trim dla tekstów; normalize sort/order do whitelist.
- RLS: jeśli włączone w przyszłości, rely on policies; dziś enforce `user_id` w kodzie.

## 6. Obsługa błędów

- Mapowanie statusów:
  - `400`: nieprawidłowe body/query, niepoprawne kombinacje XOR/rest, limit poza zakresem.
  - `401`: brak sesji.
  - `404`: ćwiczenie nie istnieje lub nie należy do użytkownika.
  - `409`: duplikat `title` (unique index) lub FK RESTRICT przy delete (powiązanie w planach/sesjach/PR).
  - `500`: nieoczekiwane błędy Supabase/DB lub serializacji kursora.
- Odpowiedzi błędów: spójny kształt `{ message, code?, details? }`; nie ujawniać danych DB.
- Logowanie: `console.error` na serwerze + (opcjonalnie) zapis do `error_logs` jeśli tabela istnieje; dołączyć `user_id`, endpoint, payload skrócony.

## 7. Wydajność

- Indeksy już zdefiniowane (`user_id`, `title_normalized`, `part`, `type`) – wykorzystać sort/where zgodne z nimi.
- Paginate kursorem z `limit + 1` i deterministycznym sortem (`created_at DESC` fallback id).
- Unikać N+1 – wszystkie operacje jednokrotne; brak joinów.
- Walidacja po stronie serwera minimalizuje koszty round-trip błędów DB.
- Cap `limit` (np. 50) i minimalne pola w select (omit `user_id`, `title_normalized` w DTO mapowaniu).

## 8. Etapy wdrożenia

1. **Przygotuj schematy Zod**: `exerciseCreateSchema`, `exerciseUpdateSchema` (partial), `exerciseQuerySchema` z whitelistą sort/order/limit/cursor. Dodaj helpery do XOR i rest validation.
2. **Warstwa serwisowa** (np. `src/services/exercises.ts`): funkcje `createExercise`, `listExercises`, `getExercise`, `updateExercise`, `deleteExercise`. Każda przyjmuje `userId` + DTO; enkapsuluje logikę walidacji biznesowej, mapowania DB → DTO, obsługę konfliktów/404.
3. **Repo/DB helper**: użyj Supabase server client; w listingu stosuj `ilike` dla search, filtry po part/type, sort whitelist, kursory (`created_at` + `id`). Dodaj util `decodeCursor/encodeCursor`.
4. **Route handlers** w `src/app/api/exercises/route.ts` i `src/app/api/exercises/[id]/route.ts`: pobranie sesji, walidacja input, wywołanie serwisu, mapowanie błędów na statusy i spójne body.
5. **Obsługa błędów**: utility do mapowania Supabase error codes (`23505`, `23503`) na `409`; default `500` z logiem. Dodaj guard dla braku sesji (`401`).
6. **Testy integracyjne** (jeśli setup): scenariusze duplikatu tytułu, brak/rest, XOR metryk, FK przy delete, paginacja kursorem, sort whitelist, search case-insensitive.
7. **Dokumentacja**: zaktualizuj README/API docs z przykładami request/response i zasadami walidacji.
