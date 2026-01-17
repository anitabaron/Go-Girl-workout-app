# Instrukcje wdrożenia na produkcję

## Data utworzenia: 2025-01-16

## Przegląd

Niniejszy dokument zawiera kompleksowe instrukcje wdrożenia aplikacji Go Girl Workout App na produkcję (Vercel). Zawiera wszystkie kroki niezbędne do bezpiecznego wdrożenia aplikacji z włączonym RLS (Row Level Security) i pełną autentykacją.

---

## Checklist przed wdrożeniem

### ✅ Weryfikacja kodu

- [x] Usunięto `DEFAULT_USER_ID` z kodu źródłowego
- [x] Wszystkie strony używają `requireAuth()` (bez fallbacku)
- [x] Wszystkie API routes używają `getUserIdFromSession()`
- [x] RLS jest włączone w migracji `20260116120000_enable_rls_for_production.sql`

### ⚠️ Przed wdrożeniem

- [ ] Migracja RLS wykonana w bazie produkcyjnej Supabase
- [ ] Zmienne środowiskowe ustawione w Vercel
- [ ] Test logowania w środowisku produkcyjnym
- [ ] Test dostępu do chronionych stron bez logowania (powinno przekierować do `/login`)
- [ ] Test izolacji danych (użytkownik A nie widzi danych użytkownika B)

---

## Krok 1: Migracja bazy danych w produkcji

### Opcja A: Użycie Supabase CLI (zalecane)

```bash
# 1. Zaloguj się do Supabase CLI
supabase login

# 2. Połącz się z projektem produkcyjnym
supabase link --project-ref your-project-ref

# 3. Uruchom wszystkie migracje
supabase db push

# 4. Weryfikuj, że RLS jest włączone
supabase db remote exec "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('exercises', 'workout_plans', 'workout_sessions', 'personal_records');"
```

### Opcja B: Ręczne wykonanie migracji

1. Otwórz Supabase Dashboard → SQL Editor
2. Skopiuj zawartość pliku: `supabase/migrations/20260116120000_enable_rls_for_production.sql`
3. Wykonaj migrację w SQL Editor
4. Sprawdź, że wszystkie tabele mają włączone RLS:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('exercises', 'workout_plans', 'workout_sessions', 'personal_records');
   ```

### Weryfikacja migracji

Po wykonaniu migracji sprawdź:

- ✅ RLS jest włączone na wszystkich tabelach
- ✅ Polityki RLS są utworzone dla wszystkich operacji (SELECT, INSERT, UPDATE, DELETE)
- ✅ Polityki sprawdzają `auth.uid()` dla izolacji danych

---

## Krok 2: Ustawienie zmiennych środowiskowych w Vercel

### Metoda 1: Dashboard Vercel (zalecane)

1. **Przejdź do projektu Vercel**

   - Otwórz [vercel.com](https://vercel.com)
   - Zaloguj się i wybierz projekt

2. **Otwórz Settings → Environment Variables**

   - Kliknij "Settings" w górnej nawigacji
   - Wybierz "Environment Variables" z bocznego menu

3. **Włącz automatyczne udostępnianie zmiennych systemowych (opcjonalne, ale zalecane)**

   - Znajdź opcję **"Automatically expose System Environment Variables"**
   - ✅ **Zaznacz tę opcję** (zalecane dla Next.js)
   - Ta opcja udostępnia zmienne systemowe Vercel takie jak:
     - `VERCEL_ENV` - środowisko (production, preview, development)
     - `VERCEL_URL` - URL deploymentu
     - `VERCEL_TARGET_ENV` - docelowe środowisko
   - **Dlaczego warto:** Next.js może używać tych zmiennych do wykrywania środowiska i konfiguracji
   - **Bezpieczeństwo:** To są tylko zmienne systemowe Vercel, nie ma ryzyka bezpieczeństwa

4. **Dodaj wymagane zmienne środowiskowe**

   **Zmienna 1:**

   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: URL projektu Supabase (np. `https://xxxxx.supabase.co`)
   - **Environment**: Wybierz wszystkie (Production, Preview, Development)
   - Kliknij "Save"

   **Zmienna 2:**

   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Klucz anon/public z Supabase Dashboard
   - **Environment**: Wybierz wszystkie (Production, Preview, Development)
   - Kliknij "Save"
   - **⚠️ UWAGA**: Vercel może wyświetlić ostrzeżenie o ekspozycji wartości w przeglądarce. To jest **BEZPIECZNE** i **NORMALNE** - klucz `anon` jest przeznaczony do użycia w przeglądarce. Możesz bezpiecznie zignorować to ostrzeżenie.

5. **⚠️ WAŻNE: NIE dodawaj `DEFAULT_USER_ID`**

   - Ta zmienna została usunięta z kodu dla bezpieczeństwa
   - Jeśli istnieje w środowisku, usuń ją

6. **Redeploy po dodaniu zmiennych**
   - Vercel automatycznie uruchomi nowy deployment po dodaniu zmiennych
   - Lub ręcznie uruchom redeploy z zakładki "Deployments"

### Metoda 2: Vercel CLI

```bash
# 1. Zainstaluj Vercel CLI (jeśli nie jest zainstalowany)
npm i -g vercel

# 2. Zaloguj się
vercel login

# 3. Dodaj zmienne środowiskowe
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Wprowadź wartość gdy zostaniesz o to poproszony
# Wybierz środowiska: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Wprowadź wartość gdy zostaniesz o to poproszony
# Wybierz środowiska: Production, Preview, Development

# 4. (Opcjonalnie) Pobierz zmienne do lokalnego pliku .env.local
vercel env pull .env.local
```

### Gdzie znaleźć wartości zmiennych środowiskowych?

**NEXT_PUBLIC_SUPABASE_URL:**

1. Otwórz Supabase Dashboard
2. Przejdź do Settings → API
3. Skopiuj "Project URL"

**NEXT_PUBLIC_SUPABASE_ANON_KEY:**

1. Otwórz Supabase Dashboard
2. Przejdź do Settings → API
3. Skopiuj "anon public" key (NIE service_role key!)

### ⚠️ Ostrzeżenie Vercel o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Vercel może wyświetlić ostrzeżenie:**
> "NEXT_PUBLIC_ exposes this value to the browser. Verify it is safe to share publicly."

**To jest BEZPIECZNE i możesz zignorować to ostrzeżenie, ponieważ:**

1. **Klucz `anon` jest przeznaczony do użycia w przeglądarce**
   - To jest publiczny klucz API, zaprojektowany specjalnie do użycia w aplikacjach frontendowych
   - Jest to standardowa praktyka w Supabase i innych serwisach BaaS

2. **RLS (Row Level Security) chroni dane**
   - Nawet jeśli klucz jest publiczny, RLS na poziomie bazy danych zapewnia, że użytkownicy widzą tylko swoje dane
   - Klucz `anon` ma ograniczone uprawnienia - nie może wykonywać operacji administracyjnych

3. **Różnica między kluczami:**
   - ✅ **`anon` key** - bezpieczny do użycia w przeglądarce (używamy tego)
   - ❌ **`service_role` key** - NIGDY nie używaj w przeglądarce (ma pełne uprawnienia)

**Wniosek:** Możesz bezpiecznie kliknąć "Save" i zignorować ostrzeżenie Vercel.

---

## Krok 3: Weryfikacja wdrożenia

### 3.1. Sprawdzenie zmiennych środowiskowych

1. Przejdź do deploymentu w Vercel dashboard
2. Otwórz "Runtime Logs"
3. Sprawdź, czy nie ma błędów związanych z brakującymi zmiennymi środowiskowymi
4. Sprawdź, czy aplikacja uruchomiła się poprawnie

### 3.2. Test funkcjonalności

**Test 1: Logowanie**

- [ ] Otwórz aplikację w przeglądarce
- [ ] Przejdź do `/login`
- [ ] Zaloguj się istniejącym kontem
- [ ] Sprawdź, czy przekierowanie do `/` działa poprawnie

**Test 2: Ochrona tras**

- [ ] Wyloguj się (lub otwórz w trybie incognito)
- [ ] Spróbuj wejść na `/exercises`
- [ ] Sprawdź, czy nastąpiło przekierowanie do `/login`
- [ ] Powtórz dla innych chronionych stron (`/workout-plans`, `/workout-sessions`, `/personal-records`)

**Test 3: Izolacja danych (RLS)**

- [ ] Zaloguj się jako Użytkownik A
- [ ] Utwórz ćwiczenie/plan treningowy
- [ ] Wyloguj się i zaloguj jako Użytkownik B
- [ ] Sprawdź, czy Użytkownik B NIE widzi danych Użytkownika A
- [ ] Sprawdź, czy Użytkownik B może tworzyć własne dane

**Test 4: API Routes**

- [ ] Zaloguj się
- [ ] Wykonaj request do API (np. `GET /api/exercises`)
- [ ] Sprawdź, czy dane są zwracane poprawnie
- [ ] Wyloguj się i spróbuj ponownie
- [ ] Sprawdź, czy API zwraca błąd 401 (UNAUTHORIZED)

### 3.3. Sprawdzenie błędów w konsoli

1. Otwórz DevTools w przeglądarce (F12)
2. Sprawdź zakładkę "Console" pod kątem błędów
3. Sprawdź zakładkę "Network" pod kątem nieudanych requestów

---

## Krok 4: Monitoring i utrzymanie

### Logi Vercel

- **Runtime Logs**: Sprawdzaj logi aplikacji w Vercel dashboard
- **Build Logs**: Sprawdzaj logi buildów po każdym deploymencie

### Supabase Dashboard

- **Database Logs**: Monitoruj zapytania do bazy danych
- **Auth Logs**: Sprawdzaj logi autentykacji
- **RLS Policies**: Weryfikuj, że polityki RLS działają poprawnie

### Alerty

Rozważ skonfigurowanie alertów dla:

- Błędów 500 w aplikacji
- Nieudanych logowań (może wskazywać na problemy z autentykacją)
- Wysokiego użycia zasobów bazy danych

---

## Rozwiązywanie problemów

### Problem: Aplikacja nie uruchamia się po wdrożeniu

**Możliwe przyczyny:**

- Brakujące zmienne środowiskowe
- Nieprawidłowe wartości zmiennych środowiskowych
- Błędy w kodzie

**Rozwiązanie:**

1. Sprawdź Runtime Logs w Vercel
2. Zweryfikuj, czy wszystkie zmienne środowiskowe są ustawione
3. Sprawdź, czy wartości zmiennych są poprawne (bez spacji, cudzysłowów)

### Problem: Błędy autoryzacji po wdrożeniu

**Możliwe przyczyny:**

- RLS nie jest włączone w bazie danych
- Polityki RLS nie są utworzone
- Nieprawidłowa konfiguracja Supabase Auth

**Rozwiązanie:**

1. Sprawdź, czy migracja RLS została wykonana
2. Zweryfikuj polityki RLS w Supabase Dashboard → Authentication → Policies
3. Sprawdź konfigurację Supabase Auth (Settings → Auth)

### Problem: Użytkownicy widzą dane innych użytkowników

**Możliwe przyczyny:**

- RLS nie jest włączone
- Polityki RLS są nieprawidłowo skonfigurowane
- Aplikacja używa nieprawidłowego `user_id`

**Rozwiązanie:**

1. Sprawdź, czy RLS jest włączone na wszystkich tabelach
2. Zweryfikuj polityki RLS (powinny sprawdzać `auth.uid()`)
3. Sprawdź logi aplikacji pod kątem błędów autoryzacji

### Problem: Błędy 401 w API routes

**Możliwe przyczyny:**

- Sesja użytkownika wygasła
- Cookies nie są przekazywane poprawnie
- Middleware nie odświeża sesji

**Rozwiązanie:**

1. Sprawdź konfigurację cookies w Supabase
2. Zweryfikuj, czy middleware działa poprawnie
3. Sprawdź logi w przeglądarce (Network tab)

---

## Bezpieczeństwo

### ✅ Zaimplementowane zabezpieczenia

1. **RLS (Row Level Security)**

   - Wszystkie tabele mają włączone RLS
   - Polityki RLS sprawdzają `auth.uid()` dla każdej operacji
   - Izolacja danych na poziomie bazy danych

2. **Autentykacja w aplikacji**

   - Wszystkie strony używają `requireAuth()` (bez fallbacku)
   - Wszystkie API routes używają `getUserIdFromSession()`
   - Middleware odświeża sesję przed każdym żądaniem

3. **Usunięcie DEFAULT_USER_ID**
   - `DEFAULT_USER_ID` został usunięty z kodu
   - Brak fallbacku do domyślnego użytkownika
   - Wszystkie operacje wymagają prawdziwej autoryzacji

### ⚠️ Uwagi bezpieczeństwa

- **NIE** ustawiaj `DEFAULT_USER_ID` w produkcji
- **NIE** wyłączaj RLS w produkcji
- **NIE** używaj `service_role` key w aplikacji frontendowej
- **Zawsze** używaj `anon` key w aplikacji frontendowej

---

## Przydatne komendy

### Supabase

```bash
# Połącz się z projektem
supabase link --project-ref your-project-ref

# Uruchom migracje
supabase db push

# Sprawdź status migracji
supabase migration list

# Utwórz backup bazy danych
supabase db dump -f backup.sql
```

### Vercel

```bash
# Zaloguj się
vercel login

# Dodaj zmienną środowiskową
vercel env add VARIABLE_NAME

# Pobierz zmienne środowiskowe
vercel env pull .env.local

# Wyświetl logi
vercel logs

# Wyświetl deploymenty
vercel ls
```

---

## Podsumowanie

Po wykonaniu wszystkich kroków:

1. ✅ Migracja RLS wykonana w bazie produkcyjnej
2. ✅ Zmienne środowiskowe ustawione w Vercel
3. ✅ Aplikacja wdrożona i działająca
4. ✅ Wszystkie testy przeszły pomyślnie
5. ✅ Monitoring skonfigurowany

Aplikacja jest gotowa do użycia w produkcji z pełnym bezpieczeństwem i izolacją danych użytkowników.

---

**Data ostatniej aktualizacji:** 2025-01-16  
**Status:** Gotowe do wdrożenia
