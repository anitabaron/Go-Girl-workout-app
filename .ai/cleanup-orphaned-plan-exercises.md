# Czyszczenie osieroconych ćwiczeń planów treningowych

## Problem

Jeśli plany treningowe zostały ręcznie usunięte z bazy danych (np. przez Supabase Dashboard lub SQL), powiązane z nimi ćwiczenia planów mogą pozostać jako osierocone rekordy. Te osierocone rekordy:
- Odnoszą się do nieistniejących planów treningowych
- Zajmują niepotrzebne miejsce w bazie danych
- Mogą powodować zamieszanie w zapytaniach do danych

## Rozwiązanie

Endpoint do czyszczenia `/api/admin/cleanup-orphaned-plan-exercises` identyfikuje i usuwa osierocone ćwiczenia planów treningowych.

## Co to są osierocone ćwiczenia planów treningowych?

Ćwiczenie planu treningowego jest uznawane za osierocone, jeśli:
1. Jego `plan_id` nie istnieje w `workout_plans`

## Szczegóły endpointu

**Ścieżka:** `/api/admin/cleanup-orphaned-plan-exercises`

**Autentykacja:** Wymagana (użytkownik musi być zalogowany)

**Metody:**
- `GET` - Sprawdza ile osieroconych ćwiczeń planów treningowych jest w bazie (tylko odczyt)
- `POST` - Usuwa osierocone ćwiczenia planów treningowych

## Użycie

### Krok 1: Sprawdzenie osieroconych rekordów (GET)

Najpierw sprawdź ile osieroconych ćwiczeń planów treningowych jest w bazie, bez usuwania:

**Lokalny development:**
```bash
curl http://localhost:3000/api/admin/cleanup-orphaned-plan-exercises
```

**Produkcja:**
```bash
curl https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-plan-exercises
```

**Odpowiedź:**
```json
{
  "message": "Found 5 orphaned workout plan exercise(s)",
  "count": 5,
  "orphanedIds": ["id1", "id2", "id3", "id4", "id5"]
}
```

Jeśli `count` wynosi `0`, nie ma osieroconych rekordów do usunięcia.

### Krok 2: Usunięcie osieroconych rekordów (POST)

Po sprawdzeniu liczby, usuń osierocone ćwiczenia planów treningowych:

**Lokalny development:**
```bash
curl -X POST http://localhost:3000/api/admin/cleanup-orphaned-plan-exercises
```

**Produkcja:**
```bash
curl -X POST https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-plan-exercises
```

**Odpowiedź:**
```json
{
  "message": "Successfully deleted 5 orphaned workout plan exercise(s)",
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
        -X POST https://go-girl-workout-app.vercel.app/api/admin/cleanup-orphaned-plan-exercises
   ```

Alternatywnie, możesz użyć konsoli DevTools w przeglądarce:
```javascript
// Sprawdź liczbę
fetch('/api/admin/cleanup-orphaned-plan-exercises')
  .then(r => r.json())
  .then(console.log);

// Usuń osierocone rekordy
fetch('/api/admin/cleanup-orphaned-plan-exercises', { method: 'POST' })
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
1. Pobiera wszystkie ćwiczenia planów z `workout_plan_exercises`
2. Pobiera wszystkie istniejące `workout_plans`
3. Identyfikuje ćwiczenia planów, które odnoszą się do nieistniejących planów
4. Usuwa osierocone rekordy

## Bezpieczeństwo

- ✅ Wymaga autentykacji użytkownika
- ✅ Używa Row-Level Security (RLS) - użytkownicy mogą uzyskać dostęp tylko do swoich danych
- ✅ Brak ekspozycji wrażliwych danych
- ✅ Bezpieczne do commitowania do repozytorium

## Powiązane pliki

- Implementacja endpointu: `src/app/api/admin/cleanup-orphaned-plan-exercises/route.ts`
- Schemat bazy danych: Zobacz `.ai/db-plan.md` i `.ai/db-summary.md`
