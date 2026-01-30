# Plan dalszego ulepszania modułu autentykacji

## Data utworzenia: 2025-01-15

## Przegląd

Niniejszy dokument zawiera plan opcjonalnych ulepszeń modułu autentykacji, które nie są wymagane do podstawowego testowania logowania, ale mogą poprawić UX i kompletność funkcjonalności.

---

## Status obecnej implementacji

### ✅ Zaimplementowane funkcjonalności

**Fundament bezpieczeństwa:** 0. ✅ **Ochrona routes** - wszystkie Server Components i API routes są chronione

- Wszystkie strony w `(app)` route group używają `getUserId()` lub `requireAuth()`
- Wszystkie API routes używają `getUserIdFromSession()` (prawdziwa autoryzacja)
- Przekierowanie do `/login` lub błąd 401 przy braku autoryzacji

**Podstawowa funkcjonalność autentykacji:**

1. ✅ Formularz logowania z walidacją (Zod)
2. ✅ Integracja z Supabase Auth (`signInWithPassword`)
3. ✅ Centralne mapowanie błędów (`mapAuthError`)
4. ✅ Zustand authStore - synchronizacja stanu w Client Components
5. ✅ AuthProvider - automatyczna synchronizacja z Supabase (`onAuthStateChange`)
6. ✅ Przekierowanie po zalogowaniu do `/`
7. ✅ Wylogowanie z czyszczeniem Zustand store
8. ✅ Error Boundary - automatyczne przekierowanie przy wygasłej sesji
9. ✅ Walidacja tokenu w `/reset-password/confirm`

### ⚠️ Uwagi dotyczące obecnej implementacji

- **Reset Password Confirm**: Weryfikacja tokenu działa, ale hook `useResetPasswordConfirmForm` wymaga pełnej implementacji
- **Callback**: Brak implementacji `/auth/callback` (wymagane tylko jeśli `enable_email_autoconfirm = false`)

---

## Uwaga: Ochrona routes jako fundament bezpieczeństwa

**Przed implementacją ulepszeń, zalecane jest upewnienie się, że:**

- ✅ Wszystkie Server Components w `(app)` route group są chronione
- ✅ Wszystkie API routes używają prawdziwej autoryzacji (nie `DEFAULT_USER_ID`)
- ✅ Próby dostępu bez autoryzacji są prawidłowo obsługiwane (przekierowanie lub 401)

Ochrona routes jest ważnym elementem pierwszego etapu wdrożenia autoryzacji. Zalecane jest wykonanie jej jako pierwszego kroku, aby zapewnić spójną ochronę wszystkich tras od początku.

---

## Plan opcjonalnych ulepszeń

### 1. Obsługa komunikatu o wygasłej sesji na stronie logowania

**Priorytet:** Średni (UX)

**Opis:**

- Wyświetlanie komunikatu, gdy `?error=session_expired` jest w URL
- Dodanie komponentu do wyświetlania komunikatów błędów z query params
- Automatyczne czyszczenie query params po wyświetleniu komunikatu

**Pliki do modyfikacji:**

- `src/app/login/page.tsx` - odczyt query params i przekazanie do formularza
- `src/components/auth/login/login-form.tsx` - wyświetlanie komunikatu o wygasłej sesji

**Implementacja:**

```typescript
// W src/app/login/page.tsx
import { searchParams } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  // ...
  const sessionExpired = searchParams?.error === "session_expired";

  return (
    <div>
      <LoginForm sessionExpired={sessionExpired} />
    </div>
  );
}
```

**Status:** ⏳ Do implementacji

---

### 3. Implementacja hooka `useResetPasswordConfirmForm`

**Priorytet:** Wysoki (kompletność funkcjonalności)

**Opis:**

- Pełna implementacja logiki resetu hasła w Client Component
- Integracja z `supabase.auth.updateUser({ password })`
- Walidacja pól (minimum 6 znaków, zgodność haseł)
- Obsługa błędów (nieprawidłowy token, wygasły token, błędy sieci)

**Pliki do utworzenia/modyfikacji:**

- `src/hooks/use-reset-password-confirm-form.ts` - nowy hook
- `src/components/reset-password/confirm/reset-password-confirm-form.tsx` - integracja z hookiem

**Implementacja:**

```typescript
// src/hooks/use-reset-password-confirm-form.ts
export function useResetPasswordConfirmForm() {
  const router = useRouter();
  const [fields, setFields] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja
    // ...

    // Wywołanie supabase.auth.updateUser({ password: fields.newPassword })
    // Obsługa błędów
    // Przekierowanie do /login po sukcesie
  };

  return { fields, errors, isLoading, handleChange, handleSubmit };
}
```

**Status:** ⏳ Do implementacji

---

### 4. Callback `/auth/callback` (jeśli `enable_email_autoconfirm = false`)

**Priorytet:** Średni (wymagane tylko w określonych konfiguracjach)

**Opis:**

- Obsługa potwierdzenia emaila po rejestracji
- Weryfikacja tokenu i przekierowanie
- Obsługa callbacków dla resetu hasła (alternatywny przepływ)

**Pliki do utworzenia:**

- `src/app/auth/callback/route.ts` - API Route Handler

**Implementacja:**

```typescript
// src/app/auth/callback/route.ts
import { createClient } from "@/db/supabase.server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get("type");
  const supabase = await createClient();

  // Weryfikacja tokenu
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", requestUrl.origin),
    );
  }

  // Przekierowanie w zależności od typu callbacku
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/reset-password/confirm", requestUrl.origin),
    );
  }

  // Domyślnie: potwierdzenie emaila
  return NextResponse.redirect(
    new URL("/login?confirmed=true", requestUrl.origin),
  );
}
```

**Status:** ⏳ Do implementacji (tylko jeśli `enable_email_autoconfirm = false`)

---

### 5. Obsługa komunikatu o potwierdzeniu emaila na stronie logowania

**Priorytet:** Niski (UX)

**Opis:**

- Wyświetlanie komunikatu sukcesu, gdy `?confirmed=true` jest w URL
- Informowanie użytkownika, że konto zostało aktywowane

**Pliki do modyfikacji:**

- `src/app/login/page.tsx` - odczyt query params
- `src/components/auth/login/login-form.tsx` - wyświetlanie komunikatu

**Status:** ⏳ Do implementacji

---

### 6. Obsługa komunikatu o nieprawidłowym tokenie w `/reset-password`

**Priorytet:** Średni (UX)

**Opis:**

- Wyświetlanie komunikatu, gdy `?error=invalid_token` jest w URL
- Informowanie użytkownika, że link resetu hasła wygasł lub jest nieprawidłowy

**Pliki do modyfikacji:**

- `src/app/reset-password/page.tsx` - odczyt query params
- `src/components/reset-password/reset-password-form.tsx` - wyświetlanie komunikatu

**Status:** ⏳ Do implementacji

---

### 7. Testy jednostkowe i integracyjne

**Priorytet:** Średni (jakość kodu)

**Opis:**

- Testy jednostkowe dla hooków (`useLoginForm`, `useResetPasswordConfirmForm`)
- Testy integracyjne dla przepływów autentykacji
- Testy E2E dla scenariuszy użytkownika

**Pliki do utworzenia:**

- `src/hooks/__tests__/use-login-form.test.ts`
- `src/hooks/__tests__/use-reset-password-confirm-form.test.ts`
- `src/lib/__tests__/auth-errors.test.ts`
- `e2e/auth.spec.ts`

**Status:** ⏳ Do implementacji

---

### 8. Monitoring i logowanie błędów autoryzacji

**Priorytet:** Niski (opcjonalne)

**Opis:**

- Logowanie prób dostępu do chronionych tras bez autoryzacji
- Monitoring wygasłych sesji
- Integracja z narzędziami monitoringu (np. Sentry)

**Status:** ⏳ Do implementacji (opcjonalne)

---

## Kolejność implementacji (sugerowana)

### Faza 1: Kompletność funkcjonalności (wysoki priorytet)

1. ✅ Implementacja hooka `useResetPasswordConfirmForm` (punkt 3)
2. ⏳ Obsługa komunikatu o nieprawidłowym tokenie w `/reset-password` (punkt 6)

### Faza 2: Ulepszenia UX (średni priorytet)

3. ⏳ Obsługa komunikatu o wygasłej sesji na stronie logowania (punkt 1)
4. ⏳ Obsługa komunikatu o potwierdzeniu emaila (punkt 5)

### Faza 3: Rozszerzenia (niski priorytet)

5. ⏳ Callback `/auth/callback` (punkt 4) - tylko jeśli wymagane
6. ⏳ Testy jednostkowe i integracyjne (punkt 7)
7. ⏳ Monitoring i logowanie (punkt 8)

---

## Uwagi implementacyjne

### Bezpieczeństwo

- ✅ Wszystkie komunikaty błędów są bezpieczne (nie ujawniają istnienia konta)
- ✅ Walidacja po stronie klienta i serwera
- ✅ RLS w bazie danych zapewnia izolację danych
- ✅ Cookies zarządzane przez `@supabase/ssr` z odpowiednimi flagami

### Zgodność z wymaganiami PRD

- ✅ US-001: Rejestracja/logowanie przez Supabase Auth
- ✅ US-002: Izolacja danych użytkowników (RLS)
- ✅ US-003: Sesja użytkownika i odświeżenie strony
- ⏳ US-001: Reset hasła - wymaga pełnej implementacji hooka (punkt 3)

---

## Podsumowanie

Wszystkie podstawowe funkcjonalności autentykacji są zaimplementowane i gotowe do testowania. Plan ulepszeń obejmuje opcjonalne funkcjonalności, które mogą poprawić UX i kompletność systemu, ale nie są wymagane do podstawowego działania aplikacji.

**Następne kroki:**

1. Testowanie obecnej implementacji logowania
2. Implementacja hooka `useResetPasswordConfirmForm` dla kompletnej funkcjonalności resetu hasła
3. Ulepszenia UX zgodnie z priorytetami

---

**Data ostatniej aktualizacji:** 2025-01-15  
**Status:** Plan gotowy do implementacji
