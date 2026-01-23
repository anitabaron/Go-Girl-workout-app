# E2E Database Teardown - Quick Guide

## Konfiguracja dla zdalnej bazy danych E2E

### 1. Skonfiguruj `.env.test`

Dodaj do pliku `.env.test`:

```env
# URL zdalnej bazy danych testowej
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co

# Anon key (znajdziesz w Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Wymagane dla zdalnych baz (nie localhost)
E2E_TEST_ENV=true
```

### 2. Uruchom teardown

```bash
# Wyczyść wszystkie dane testowe
pnpm e2e:teardown

# Wyczyść dane dla konkretnego użytkownika
pnpm e2e:teardown --user=USER_ID
```

## Automatyczny teardown

Teardown uruchamia się automatycznie po zakończeniu wszystkich testów e2e.

Aby wyłączyć automatyczny teardown, dodaj do `.env.test`:
```env
E2E_SKIP_TEARDOWN=true
```

## Bezpieczeństwo

- Teardown jest zablokowany dla URL-i produkcyjnych (zawierających "production" lub "prod")
- Dla zdalnych URL-i Supabase wymagane jest `E2E_TEST_ENV=true`
- Localhost jest zawsze dozwolony dla lokalnego testowania

## Gdzie znaleźć Anon Key?

1. Otwórz Supabase Dashboard
2. Przejdź do **Settings** → **API**
3. Skopiuj **anon public** key
4. ⚠️ **UWAGA**: Teardown będzie działał tylko jeśli RLS pozwala na usuwanie danych
