# Czyszczenie osieroconych set logs

## Problem

Jeśli sesje treningowe zostały ręcznie usunięte z bazy danych (np. przez Supabase Dashboard lub SQL), powiązane z nimi set logs mogą pozostać jako osierocone rekordy. Te osierocone rekordy:
- Odnoszą się do nieistniejących sesji treningowych
- Zajmują niepotrzebne miejsce w bazie danych
- Mogą powodować zamieszanie w zapytaniach do danych

## Rozwiązanie

Endpoint do czyszczenia `/api/admin/cleanup-orphaned-sets` identyfikuje i usuwa osierocone set logs.

## Co to są osierocone set logs?

Set log jest uznawany za osierocony, jeśli:
1. Jego `session_exercise_id` nie istnieje w `workout_session_exercises`, LUB
2. `workout_session_exercises.session_id` nie istnieje w `workout_sessions`

## Szczegóły endpointu

**Ścieżka:** `/api/admin/cleanup-orphaned-sets`

**Autentykacja:** Wymagana (użytkownik musi być zalogowany)

**Metody:**
- `GET` - Sprawdza ile osieroconych set logs jest w bazie (tylko odczyt)
- `POST` - Usuwa osierocone set logs

## Użycie

### Krok 1: Sprawdzenie osieroconych rekordów (GET)

Najpierw sprawdź ile osieroconych set logs jest w bazie, bez usuwania:

**Lokalny development:**
```bash
curl http://localhost:3000/api/admin/cleanup-orphaned-sets
```

**Produkcja:**
```bash
curl https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-sets
```

**Odpowiedź:**
```json
{
  "message": "Found 5 orphaned set log(s)",
  "count": 5,
  "orphanedIds": ["id1", "id2", "id3", "id4", "id5"]
}
```

Jeśli `count` wynosi `0`, nie ma osieroconych rekordów do usunięcia.

### Krok 2: Usunięcie osieroconych rekordów (POST)

Po sprawdzeniu liczby, usuń osierocone set logs:

**Lokalny development:**
```bash
curl -X POST http://localhost:3000/api/admin/cleanup-orphaned-sets
```

**Produkcja:**
```bash
curl -X POST https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-sets
```

**Odpowiedź:**
```json
{
  "message": "Successfully deleted 5 orphaned set log(s)",
  "deletedCount": 5
}
```

## Autentykacja

Endpoint wymaga autentykacji. Przy użyciu `curl`, musisz dołączyć cookies sesji. W przeglądarce (gdy jesteś zalogowana), działa automatycznie.

**Użycie curl z autentykacją:**
1. Zaloguj się do aplikacji w przeglądarce
2. Otwórz DevTools → zakładka Network
3. Wykonaj zapytanie do dowolnego endpointu wymagającego autentykacji
4. Skopiuj nagłówek `Cookie` z zapytania
5. Użyj go w curl:
   ```bash
   curl -H "Cookie: twoj-session-cookie-tutaj" \
        -X POST https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-sets
   ```

Alternatywnie, możesz użyć konsoli DevTools w przeglądarce:
```javascript
// Sprawdź liczbę
fetch('/api/admin/cleanup-orphaned-sets')
  .then(r => r.json())
  .then(console.log);

// Usuń osierocone rekordy
fetch('/api/admin/cleanup-orphaned-sets', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

## Zalecany workflow

1. **Najpierw użyj GET** aby sprawdzić ile rekordów zostanie usuniętych
2. **Przejrzyj liczbę** - upewnij się, że ma sens
3. **Jeśli wszystko wygląda dobrze, użyj POST** aby je usunąć
4. **Zweryfikuj** uruchamiając ponownie GET (powinno zwrócić `count: 0`)

## Obsługa błędów

### 401 Unauthorized
- Nie jesteś zalogowana
- Rozwiązanie: Najpierw zaloguj się do aplikacji

### 500 Internal Server Error
- Problem z połączeniem do bazy danych lub błąd zapytania
- Sprawdź szczegóły błędu w odpowiedzi
- Zweryfikuj połączenie z bazą danych

## Szczegóły implementacji

Endpoint:
1. Pobiera wszystkie set logs z `workout_session_sets`
2. Pobiera wszystkie istniejące `workout_session_exercises` z ich `session_id`
3. Pobiera wszystkie istniejące `workout_sessions`
4. Identyfikuje set logs, które odnoszą się do nieistniejących ćwiczeń lub sesji
5. Usuwa osierocone rekordy

## Bezpieczeństwo

- ✅ Wymaga autentykacji użytkownika
- ✅ Używa Row-Level Security (RLS) - użytkownicy mogą uzyskać dostęp tylko do swoich danych
- ✅ Brak ekspozycji wrażliwych danych
- ✅ Bezpieczne do commitowania do repozytorium

## Powiązane pliki

- Implementacja endpointu: `src/app/api/admin/cleanup-orphaned-sets/route.ts`
- Schemat bazy danych: Zobacz `.ai/db-plan.md` i `.ai/db-summary.md`
