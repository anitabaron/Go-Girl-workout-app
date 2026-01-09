# Konfiguracja Supabase w projekcie

Ten dokument opisuje konfigurację Supabase w projekcie Next.js 16 oraz jak sprawdzić, czy wszystko jest poprawnie skonfigurowane.

## Weryfikacja konfiguracji

Aby sprawdzić, czy Supabase jest poprawnie skonfigurowany, uruchom:

```bash
pnpm check:supabase
```

Skrypt sprawdzi:

- ✅ Istnienie i poprawność pliku `.env.local`
- ✅ Zainstalowane pakiety (`@supabase/supabase-js`, `@supabase/ssr`)
- ✅ Strukturę klientów Supabase
- ✅ Obecność migracji

## Struktura klientów

Projekt używa dwóch osobnych klientów Supabase, zgodnie z najlepszymi praktykami dla Next.js 16 App Router:

### 1. Klient dla Client Components

**Plik:** `src/db/src/db/supabase.client.ts`

Używaj tego klienta w komponentach oznaczonych `"use client"`:

```tsx
"use client";

import { supabase } from "@/db/src/db/supabase.client";

export function MyComponent() {
  const fetchData = async () => {
    const { data, error } = await supabase.from("exercises").select("*");

    if (error) {
      console.error(error);
      return;
    }

    return data;
  };

  // ...
}
```

### 2. Klient dla Server Components i Server Actions

**Plik:** `src/db/src/db/supabase.server.ts`

Używaj tego klienta w Server Components i Server Actions:

```tsx
import { createClient } from "@/db/src/db/supabase.server";

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return <div>{/* render data */}</div>;
}
```

W Server Actions:

```tsx
"use server";

import { createClient } from "@/db/src/db/supabase.server";

export async function getExercises() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

## Zmienne środowiskowe

Upewnij się, że masz plik `.env.local` z następującymi zmiennymi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Ważne:**

- Zmienne muszą zaczynać się od `NEXT_PUBLIC_`, aby były dostępne w przeglądarce
- Nigdy nie commituj pliku `.env.local` do repozytorium
- Użyj `.env.example` jako szablonu dla innych deweloperów

## Pakiety

Projekt używa następujących pakietów Supabase:

- `@supabase/supabase-js` - podstawowy klient JavaScript
- `@supabase/ssr` - klient dla Next.js z obsługą SSR i cookies (zalecany dla Next.js 16)
- `supabase` - CLI do zarządzania migracjami (opcjonalne)

## Migracje

Migracje znajdują się w katalogu `supabase/migrations/`.

Aby zastosować migracje lokalnie (jeśli używasz lokalnego Supabase):

```bash
supabase db reset
```

Aby zastosować migracje na produkcji, użyj Supabase Dashboard lub CLI.

## Row-Level Security (RLS)

Projekt używa Row-Level Security do zabezpieczenia danych. Upewnij się, że:

1. RLS jest włączone dla wszystkich tabel
2. Polityki (policies) są poprawnie skonfigurowane
3. Testuj dostęp do danych z odpowiednimi uprawnieniami

## Rozwiązywanie problemów

### Błąd: "Missing NEXT_PUBLIC_SUPABASE_URL"

- Sprawdź, czy plik `.env.local` istnieje
- Sprawdź, czy zmienne są poprawnie ustawione
- Uruchom ponownie serwer deweloperski (`pnpm dev`)

### Błąd: "Invalid API key"

- Sprawdź, czy używasz `ANON_KEY`, a nie `SERVICE_ROLE_KEY`
- Sprawdź, czy klucz jest poprawny w Supabase Dashboard

### Brak danych mimo poprawnego zapytania

- Sprawdź polityki RLS w Supabase Dashboard
- Upewnij się, że użytkownik ma odpowiednie uprawnienia
- Sprawdź logi w Supabase Dashboard

## Dokumentacja

- [Supabase JavaScript SDK](https://supabase.com/docs/reference/javascript)
- [Supabase SSR dla Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router](https://nextjs.org/docs/app)
