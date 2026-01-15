# Specyfikacja architektury modułu autentykacji

## 1. Przegląd

Niniejsza specyfikacja opisuje architekturę modułu rejestracji, logowania i odzyskiwania hasła dla aplikacji Go Girl Workout App, zgodnie z wymaganiami US-001, US-002 i US-003 z PRD. Moduł wykorzystuje Supabase Auth w połączeniu z Next.js 16 App Router, zapewniając bezpieczne uwierzytelnianie użytkowników oraz izolację danych na poziomie bazy danych (RLS).

### 1.1 Zakres funkcjonalności

Moduł autentykacji obejmuje:

- **Rejestrację** nowych użytkowników (`/register`)
- **Logowanie** istniejących użytkowników (`/login`)
- **Reset hasła** dla zapomnianych haseł (`/reset-password`)
- **Wylogowywanie** użytkowników
- **Zarządzanie sesją** użytkownika (odświeżanie, walidacja)
- **Ochronę tras** aplikacji przed nieautoryzowanym dostępem

### 1.2 Założenia techniczne

- Next.js 16 App Router z Server Components i Client Components
- Supabase Auth z `@supabase/ssr` do zarządzania sesjami przez cookies
- Zustand do globalnego zarządzania stanem autentykacji w Client Components
- TypeScript 5 dla bezpieczeństwa typów
- React 19 dla komponentów interaktywnych
- Walidacja po stronie klienta z użyciem Zod
- RLS (Row Level Security) w Supabase dla izolacji danych

---

## 2. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 2.1 Struktura routingu i layoutów

#### 2.1.1 Routing publiczny (niezalogowani)

**Strony dostępne bez autoryzacji:**

1. **`/` (strona główna)**

   - Server Component: `src/app/(app)/page.tsx`
   - Dostęp: publiczny (niezalogowani i zalogowani)
   - Layout: `(app)` layout z nawigacją (warunkowo wyświetlaną)
   - Funkcjonalność: prezentacja aplikacji, możliwość przejścia do logowania

2. **`/login` (logowanie)**

   - Server Component: `src/app/login/page.tsx`
   - Dostęp: tylko niezalogowani (przekierowanie zalogowanych do `/`)
   - Layout: własny layout bez nawigacji aplikacji
   - Funkcjonalność: formularz logowania email/password

3. **`/register` (rejestracja)**

   - Server Component: `src/app/register/page.tsx`
   - Dostęp: tylko niezalogowani (przekierowanie zalogowanych do `/`)
   - Layout: własny layout bez nawigacji aplikacji
   - Funkcjonalność: formularz rejestracji z walidacją haseł

4. **`/reset-password` (reset hasła)**
   - Server Component: `src/app/reset-password/page.tsx`
   - Dostęp: publiczny (niezalogowani i zalogowani)
   - Layout: własny layout bez nawigacji aplikacji
   - Funkcjonalność: formularz resetu hasła przez email

#### 2.1.2 Routing chroniony (wymaga autoryzacji)

**Wszystkie strony w `(app)` route group wymagają autoryzacji:**

- `/(app)/exercises/*` - zarządzanie ćwiczeniami
- `/(app)/workout-plans/*` - zarządzanie planami treningowymi
- `/(app)/workout-sessions/*` - sesje treningowe
- `/(app)/personal-records/*` - rekordy osobiste

**Mechanizm ochrony:**

- Każda Server Component w `(app)` używa `getUserId()` z `@/lib/auth` do weryfikacji autoryzacji
- Server Components pobierają użytkownika przez `createClient()` i przekazują go jako props do Client Components
- Client Components inicjalizują globalny `authStore` (Zustand) z danymi użytkownika z Server Components
- Funkcja `getUserId()` rzuca błąd, jeśli użytkownik nie jest zalogowany
- Middleware odświeża sesję, ale nie blokuje dostępu (weryfikacja w komponentach)

#### 2.1.3 Layout aplikacji

**Layout główny (`src/app/layout.tsx`):**

- Server Component
- Definiuje globalne style, metadata, providers
- Nie zawiera logiki autentykacji

**Layout aplikacji (`src/app/(app)/layout.tsx`):**

- Server Component
- Pobiera użytkownika przez `createClient()` z `@/db/supabase.server`
- Renderuje `TopNavigation` (desktop) i `BottomNavigation` (mobile)
- Przekazuje `user` do komponentów nawigacji
- **Opcjonalnie:** Renderuje `AuthProvider` (Client Component), który inicjalizuje `authStore` z Zustand
- **Nie blokuje dostępu** - to zadanie poszczególnych stron

**Przykład z AuthProvider:**

```typescript
// src/app/(app)/layout.tsx
export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AuthProvider user={user}>
        <TopNavigation user={user} />
        {children}
        <BottomNavigation user={user} />
      </AuthProvider>
    </>
  );
}
```

### 2.2 Komponenty widoków autentykacji

#### 2.2.1 Widok logowania (`/login`)

**Struktura komponentów:**

```
LoginPage (Server Component)
└── LoginForm (Client Component)
    ├── LoginFormFields (Client Component)
    │   ├── EmailInput (Client Component)
    │   └── PasswordInput (Client Component)
    ├── RememberMeCheckbox (Client Component)
    ├── ValidationErrors (Client Component)
    ├── LoginButton (Client Component)
    └── LoginLinks (Client Component)
        ├── ForgotPasswordLink
        └── RegisterLink
```

**LoginPage (Server Component):**

- **Lokalizacja:** `src/app/login/page.tsx`
- **Odpowiedzialność:**
  - Sprawdzenie sesji użytkownika przez `createClient()`
  - Przekierowanie zalogowanych użytkowników do `/` przez `redirect()`
  - Renderowanie layoutu strony z `PageHeader` i `Card`
- **Props:** brak (komponent strony)
- **Metadata:** tytuł i opis strony dla SEO

**LoginForm (Client Component):**

- **Lokalizacja:** `src/components/auth/login/login-form.tsx`
- **Odpowiedzialność:**
  - Integracja z hookiem `useLoginForm` z `@/hooks/use-login-form`
  - Renderowanie struktury formularza
  - Przekazywanie props do komponentów potomnych
- **Stan:** zarządzany przez `useLoginForm` hook
- **Integracja z Supabase:** przez hook, używa `supabase.auth.signInWithPassword()`

**useLoginForm Hook:**

- **Lokalizacja:** `src/hooks/use-login-form.ts`
- **Odpowiedzialność:**
  - Zarządzanie stanem formularza (email, password, rememberMe)
  - Walidacja pól z użyciem Zod schema
  - Obsługa submit z integracją Supabase Auth
  - Obsługa błędów (walidacja, autoryzacja, sieć)
  - Przekierowanie po udanym logowaniu
- **Walidacja:**
  - Email: wymagany, format email, trim
  - Password: wymagany, minimum 6 znaków
  - RememberMe: opcjonalny boolean
- **Obsługa błędów:**
  - Email niepotwierdzony → komunikat o konieczności aktywacji
  - Rate limit → komunikat o zbyt wielu próbach
  - Błąd serwera (5xx) → komunikat o błędzie serwera
  - Nieprawidłowe dane → komunikat ogólny (bez ujawniania, czy email istnieje)
- **Integracja:** `supabase.auth.signInWithPassword()` z `@/db/supabase.client`

#### 2.2.2 Widok rejestracji (`/register`)

**Struktura komponentów:**

```
RegisterPage (Server Component)
└── RegisterForm (Client Component)
    ├── EmailInput (Client Component)
    ├── PasswordInput (Client Component)
    ├── ConfirmPasswordInput (Client Component)
    ├── SubmitButton (Client Component)
    └── LoginLink (Client Component)
```

**RegisterPage (Server Component):**

- **Lokalizacja:** `src/app/register/page.tsx`
- **Odpowiedzialność:**
  - Sprawdzenie sesji użytkownika
  - Przekierowanie zalogowanych do `/`
  - Renderowanie layoutu z tytułem i opisem
- **Props:** brak

**RegisterForm (Client Component):**

- **Lokalizacja:** `src/components/auth/register/register-form.tsx`
- **Odpowiedzialność:**
  - Zarządzanie stanem formularza (email, password, confirmPassword)
  - Walidacja pól z użyciem funkcji z `@/lib/validation/register-form`
  - Integracja z Supabase Auth (`supabase.auth.signUp()`)
  - Obsługa błędów i sukcesu
- **Walidacja:**
  - Email: wymagany, format email
  - Password: wymagany, minimum 6 znaków (zgodnie z Supabase)
  - ConfirmPassword: wymagany, musi być identyczny z password
- **Obsługa błędów:**
  - Konto już istnieje → komunikat z sugestią logowania
  - Hasło nie spełnia wymagań → komunikat o wymaganiach
  - Nieprawidłowy email → komunikat o formacie
  - Błąd sieci → komunikat o braku połączenia
- **Scenariusze sukcesu:**
  - Automatyczne logowanie (jeśli `enable_confirmations = false`) → przekierowanie do `/`
  - Wymagane potwierdzenie emaila (jeśli `enable_confirmations = true`) → komunikat + przekierowanie do `/login`
- **Integracja:** `supabase.auth.signUp()` z opcją `emailRedirectTo: /auth/callback`

#### 2.2.3 Widok resetu hasła (`/reset-password`)

**Struktura komponentów:**

```
ResetPasswordPage (Server Component)
└── ResetPasswordForm (Client Component)
    ├── ResetPasswordInstructions (Client Component)
    ├── ResetPasswordFormFields (Client Component)
    │   └── EmailInput (Client Component)
    ├── ResetPasswordButton (Client Component)
    └── BackToLoginLink (Client Component)
```

**ResetPasswordPage (Server Component):**

- **Lokalizacja:** `src/app/reset-password/page.tsx`
- **Odpowiedzialność:**
  - Renderowanie layoutu strony
  - Brak sprawdzania sesji (widok dostępny dla wszystkich)
- **Props:** brak

**ResetPasswordForm (Client Component):**

- **Lokalizacja:** `src/components/reset-password/reset-password-form.tsx`
- **Odpowiedzialność:**
  - Integracja z hookiem `useResetPasswordForm`
  - Renderowanie formularza z instrukcjami
- **Stan:** zarządzany przez hook

**useResetPasswordForm Hook:**

- **Lokalizacja:** `src/hooks/use-reset-password-form.ts`
- **Odpowiedzialność:**
  - Zarządzanie stanem (email)
  - Walidacja emaila
  - Wywołanie `supabase.auth.resetPasswordForEmail()`
  - Obsługa błędów i sukcesu
- **Walidacja:**
  - Email: wymagany, format email
- **Obsługa błędów:**
  - Rate limit → komunikat o zbyt wielu próbach
  - Nieprawidłowy email → komunikat o formacie
  - Inne błędy → komunikat ogólny
- **Bezpieczeństwo:**
  - Zawsze wyświetla pozytywny komunikat (nawet jeśli email nie istnieje)
  - Zapobiega wyciekowi informacji o istnieniu konta
- **Integracja:** `supabase.auth.resetPasswordForEmail()` z `redirectTo: /reset-password/confirm`

### 2.3 Komponenty nawigacji

#### 2.3.1 TopNavigation (Desktop)

**Lokalizacja:** `src/components/navigation/top-navigation.tsx`

**Odpowiedzialność:**

- Renderowanie górnego paska nawigacji dla desktop (≥768px)
- Wyświetlanie przycisku logowania/wylogowania w zależności od stanu sesji
- Obsługa wylogowania przez `supabase.auth.signOut()`

**Props:**

```typescript
interface TopNavigationProps {
  user?: User | null; // Użytkownik z Supabase Auth
  activeSection?: string;
}
```

**Funkcjonalność wylogowania:**

- Wywołanie `supabase.auth.signOut()`
- Obsługa błędów z toast notification
- Przekierowanie do `/login` po sukcesie
- Odświeżenie routera (`router.refresh()`)

#### 2.3.2 BottomNavigation (Mobile)

**Lokalizacja:** `src/components/navigation/bottom-navigation.tsx`

**Odpowiedzialność:**

- Renderowanie dolnego paska nawigacji dla mobile (<768px)
- Wyświetlanie przycisku logowania/wylogowania
- Analogiczna funkcjonalność do TopNavigation

### 2.4 Zarządzanie stanem autentykacji (Zustand Store)

#### 2.4.1 authStore

**Lokalizacja:** `src/stores/auth-store.ts` (lub podobna)

**Odpowiedzialność:**

- Globalne zarządzanie stanem użytkownika w Client Components
- Synchronizacja z danymi użytkownika z Server Components
- Dostęp do stanu użytkownika w całej aplikacji bez prop drilling

**Struktura store:**

```typescript
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  isAuthenticated: () => get().user !== null,
}));
```

**Inicjalizacja store:**

- Server Components pobierają użytkownika przez `createClient()`
- Przekazują `user` jako props do Client Components (np. w `(app)/layout.tsx`)
- Client Component w layout inicjalizuje store przy montowaniu:

```typescript
// W Client Component (np. AuthProvider)
"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@supabase/supabase-js";

interface AuthProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export function AuthProvider({ user, children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  return <>{children}</>;
}
```

**Użycie w komponentach:**

```typescript
"use client";
import { useAuthStore } from "@/stores/auth-store";

export function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (!isAuthenticated) {
    return <div>Musisz się zalogować</div>;
  }

  return <div>Witaj, {user?.email}</div>;
}
```

**Synchronizacja z Supabase Auth:**

- Po logowaniu: `useLoginForm` może aktualizować store przez `setUser(data.user)`
- Po wylogowaniu: `signOut()` powinien wywołać `clearUser()` w store
- Po odświeżeniu strony: Server Component przekazuje `user` do `AuthProvider`, który aktualizuje store

**Uwagi:**

- Store jest używany tylko w Client Components (Zustand nie działa w Server Components)
- Server Components nadal używają `getUserId()` do weryfikacji autoryzacji
- Store służy głównie do wyświetlania stanu użytkownika w UI (np. nawigacja, menu użytkownika)
- RLS w bazie danych zapewnia bezpieczeństwo niezależnie od stanu w store

### 2.5 Walidacja i komunikaty błędów

#### 2.4.1 Walidacja po stronie klienta

**Narzędzie:** Zod schemas

**Lokalizacja schematów:**

- Login: `src/hooks/use-login-form.ts` (inline schema)
- Register: `src/lib/validation/register-form.ts`
- Reset Password: `src/hooks/use-reset-password-form.ts` (inline schema)

**Zasady walidacji:**

1. **Email:**

   - Wymagany
   - Format email (walidacja Zod)
   - Trim przed walidacją

2. **Password:**

   - Wymagany
   - Minimum 6 znaków (zgodnie z wymaganiami Supabase)
   - Dla rejestracji: walidacja zgodności z confirmPassword

3. **ConfirmPassword:**
   - Wymagany
   - Musi być identyczny z password

**Moment walidacji:**

- **onBlur:** walidacja pojedynczego pola przy opuszczeniu
- **onSubmit:** walidacja całego formularza przed wysłaniem
- **onChange:** czyszczenie błędów przy zmianie wartości

#### 2.4.2 Komunikaty błędów

**Typy komunikatów:**

1. **Błędy walidacji (inline):**

   - Wyświetlane pod polem formularza
   - Czerwony border pola (`aria-invalid="true"`)
   - Komunikat tekstowy w `<span>` lub `<p>`

2. **Błędy formularza (globalne):**

   - Wyświetlane w komponencie `ValidationErrors`
   - Lista błędów w `<ul>` z klasą `destructive`
   - Scroll do pierwszego błędu przy submit

3. **Toast notifications:**
   - Używane dla błędów serwera i sukcesów
   - Biblioteka: `sonner` (`toast.error()`, `toast.success()`)
   - Automatyczne zniknięcie po kilku sekundach

**Mapowanie błędów Supabase:**

| Błąd Supabase                           | Komunikat użytkownika                                                     |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `email not confirmed`                   | "Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny." |
| `rate limit` / `too many requests`      | "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę."                  |
| `already registered` / `already exists` | "Konto z tym adresem email już istnieje. Zaloguj się lub zresetuj hasło." |
| `invalid email`                         | "Nieprawidłowy format email."                                             |
| `Password` (błąd hasła)                 | "Hasło nie spełnia wymagań. Upewnij się, że ma minimum 6 znaków."         |
| Błąd sieci (TypeError)                  | "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."    |
| Błąd serwera (5xx)                      | "Wystąpił błąd serwera. Spróbuj ponownie później."                        |
| Domyślny                                | "Nieprawidłowy email lub hasło" (logowanie) / "Wystąpił błąd..." (inne)   |

**Zasady bezpieczeństwa:**

- Nie ujawniaj, czy email istnieje w systemie (ogólne komunikaty)
- Nie ujawniaj szczegółów błędów serwera (ogólne komunikaty)
- Dla resetu hasła: zawsze pozytywny komunikat (nawet jeśli email nie istnieje)

### 2.6 Obsługa scenariuszy

#### 2.5.1 Scenariusz: Logowanie

**Kroki:**

1. Użytkownik wprowadza email i hasło
2. Walidacja po stronie klienta (Zod)
3. Jeśli błędy walidacji → wyświetlenie błędów, brak wysłania
4. Wywołanie `supabase.auth.signInWithPassword()`
5. Jeśli błąd → wyświetlenie komunikatu błędu (toast + inline)
6. Jeśli sukces → przekierowanie do `/` + toast sukcesu

**Przypadki brzegowe:**

- Email niepotwierdzony → komunikat o aktywacji
- Rate limit → komunikat o zbyt wielu próbach
- Błąd sieci → komunikat o braku połączenia
- Sesja wygasła → automatyczne odświeżenie przez middleware

#### 2.5.2 Scenariusz: Rejestracja

**Kroki:**

1. Użytkownik wprowadza email, password, confirmPassword
2. Walidacja po stronie klienta
3. Wywołanie `supabase.auth.signUp()`
4. Sprawdzenie odpowiedzi:
   - Jeśli `data.user && data.session` → automatyczne logowanie → przekierowanie do `/`
   - Jeśli `data.user && !data.session` → wymagane potwierdzenie → przekierowanie do `/login`
   - Jeśli błąd → wyświetlenie komunikatu błędu

**Przypadki brzegowe:**

- Konto już istnieje → komunikat z sugestią logowania
- Hasło nie spełnia wymagań → komunikat o wymaganiach
- Błąd sieci → komunikat o braku połączenia

#### 2.5.3 Scenariusz: Reset hasła

**Kroki:**

1. Użytkownik wprowadza email
2. Walidacja emaila
3. Wywołanie `supabase.auth.resetPasswordForEmail()`
4. Zawsze wyświetlenie pozytywnego komunikatu (bezpieczeństwo)
5. Instrukcja sprawdzenia skrzynki email

**Przypadki brzegowe:**

- Rate limit → komunikat o zbyt wielu próbach
- Nieprawidłowy email → komunikat o formacie
- Email nie istnieje → pozytywny komunikat (bez ujawniania)

#### 2.5.4 Scenariusz: Wylogowanie

**Kroki:**

1. Użytkownik klika przycisk "Wyloguj" w nawigacji
2. Wywołanie `supabase.auth.signOut()`
3. Jeśli błąd → toast z komunikatem błędu
4. Jeśli sukces → przekierowanie do `/login` + odświeżenie routera

#### 2.5.5 Scenariusz: Odświeżenie strony

**Kroki:**

1. Middleware odświeża sesję przez `supabase.auth.getUser()`
2. Server Components pobierają użytkownika przez `createClient()`
3. Jeśli sesja ważna → użytkownik pozostaje zalogowany
4. Jeśli sesja wygasła → `getUserId()` rzuca błąd → przekierowanie do `/login` (lub obsługa błędu w komponencie)

---

## 3. LOGIKA BACKENDOWA

### 3.1 Struktura klientów Supabase

#### 3.1.1 Klient dla Server Components i Server Actions

**Lokalizacja:** `src/db/supabase.server.ts`

**Funkcja:** `createClient()`

**Odpowiedzialność:**

- Tworzenie klienta Supabase dla środowiska server-side
- Zarządzanie cookies przez `@supabase/ssr`
- Synchronizacja sesji między middleware a Server Components

**Użycie:**

```typescript
// W Server Component
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

// W Server Action
("use server");
export async function myAction() {
  const supabase = await createClient();
  // ...
}
```

**Implementacja:**

- Używa `createServerClient` z `@supabase/ssr`
- Cookies zarządzane przez `cookies()` z `next/headers`
- Obsługa błędów przy `setAll` (ignorowanie w Server Components, middleware odświeża sesję)

#### 3.1.2 Klient dla Client Components

**Lokalizacja:** `src/db/supabase.client.ts`

**Eksport:** `supabase` (singleton)

**Odpowiedzialność:**

- Tworzenie klienta Supabase dla środowiska client-side
- Synchronizacja sesji przez cookies (SSR-compatible)
- Używany w komponentach `"use client"`

**Użycie:**

```typescript
"use client";
import { supabase } from "@/db/supabase.client";

const { data, error } = await supabase.auth.signInWithPassword({...});
```

**Implementacja:**

- Używa `createBrowserClient` z `@supabase/ssr`
- Automatyczna synchronizacja cookies z serwerem

### 3.2 Middleware

**Lokalizacja:** `src/middleware.ts`

**Odpowiedzialność:**

- Odświeżanie sesji użytkownika przed renderowaniem Server Components
- Zarządzanie cookies dla Supabase Auth
- **Nie blokuje dostępu** do tras (weryfikacja w komponentach)

**Implementacja:**

```typescript
export async function middleware(request: NextRequest) {
  // Tworzenie klienta Supabase z cookies
  const supabase = createServerClient(...);

  // Odświeżenie sesji (wymagane dla Server Components)
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

**Konfiguracja matcher:**

- Wszystkie trasy oprócz statycznych plików (`_next/static`, `_next/image`, `favicon.ico`, obrazy)

**Uwagi:**

- Middleware nie sprawdza autoryzacji (to zadanie komponentów)
- Publiczne trasy (`/login`, `/register`, `/reset-password`) są dostępne
- Chronione trasy weryfikują autoryzację w Server Components przez `getUserId()`

### 3.3 Funkcje pomocnicze autentykacji

#### 3.3.1 getUserId()

**Lokalizacja:** `src/lib/auth.ts`

**Funkcja:** `getUserId(): Promise<string>`

**Odpowiedzialność:**

- Pobranie ID użytkownika z sesji Supabase
- Rzucenie błędu, jeśli użytkownik nie jest zalogowany
- Fallback do `DEFAULT_USER_ID` w środowisku development (jeśli skonfigurowane)

**Użycie:**

```typescript
// W Server Component
const userId = await getUserId();
// Użycie userId w zapytaniach do bazy danych
```

**Implementacja:**

1. Tworzenie klienta Supabase przez `createClient()`
2. Pobranie użytkownika przez `supabase.auth.getUser()`
3. Jeśli `user?.id` istnieje → zwrócenie `user.id`
4. Jeśli brak użytkownika:
   - Sprawdzenie `process.env.DEFAULT_USER_ID`
   - Jeśli istnieje → zwrócenie (development)
   - Jeśli brak → rzucenie błędu

**Obsługa błędów:**

- Brak sesji → błąd "Brak aktywnej sesji i DEFAULT_USER_ID w środowisku"
- Błąd sieci → propagacja błędu Supabase

### 3.4 Walidacja danych wejściowych

#### 3.4.1 Walidacja po stronie serwera

**Zasada:** Supabase Auth waliduje dane po stronie serwera, ale aplikacja powinna również walidować po stronie klienta dla lepszego UX.

**Walidacja w API routes:**

- API routes nie są używane do autentykacji (Supabase Auth działa bezpośrednio z klienta)
- API routes używają `getUserId()` do weryfikacji autoryzacji
- Walidacja danych domenowych (ćwiczenia, plany, sesje) odbywa się w API routes

#### 3.4.2 Walidacja w Server Components

**Zasada:** Server Components nie walidują danych formularzy (to zadanie Client Components), ale weryfikują autoryzację.

**Przykład:**

```typescript
// src/app/(app)/exercises/page.tsx
export default async function ExercisesPage() {
  const userId = await getUserId(); // Weryfikacja autoryzacji
  // Pobranie danych dla userId
}
```

### 3.5 Obsługa wyjątków

#### 3.5.1 Błędy autentykacji

**Typy błędów:**

1. **Brak sesji:**

   - Występuje w `getUserId()` gdy użytkownik nie jest zalogowany
   - Obsługa: przekierowanie do `/login` lub wyświetlenie błędu w komponencie

2. **Sesja wygasła:**

   - Middleware próbuje odświeżyć sesję
   - Jeśli nie można odświeżyć → użytkownik musi się zalogować ponownie

3. **Błędy Supabase Auth:**
   - Obsługiwane w Client Components (toast + inline errors)
   - Mapowanie błędów na komunikaty użytkownika (patrz sekcja 2.4.2)

#### 3.5.2 Błędy sieciowe

**Obsługa:**

- Wykrywanie `TypeError` z `message.includes("fetch")`
- Komunikat: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Toast notification + komunikat w formularzu

#### 3.5.3 Błędy serwera (5xx)

**Obsługa:**

- Wykrywanie statusu `error.status >= 500`
- Komunikat: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Toast notification

### 3.6 Renderowanie server-side

#### 3.6.1 Server Components dla stron autentykacji

**Zasada:** Strony autentykacji (`/login`, `/register`, `/reset-password`) są Server Components, które:

- Sprawdzają sesję użytkownika
- Przekierowują zalogowanych (dla `/login` i `/register`)
- Renderują Client Components z formularzami

**Przykład:**

```typescript
// src/app/login/page.tsx
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/"); // Przekierowanie zalogowanych
  }

  return <LoginForm />; // Client Component
}
```

#### 3.6.2 Server Components dla chronionych stron

**Zasada:** Wszystkie strony w `(app)` używają `getUserId()` do weryfikacji autoryzacji.

**Przykład:**

```typescript
// src/app/(app)/exercises/page.tsx
export default async function ExercisesPage() {
  const userId = await getUserId(); // Weryfikacja + pobranie ID
  // Pobranie danych dla userId
  // Renderowanie komponentów
}
```

**Obsługa błędów:**

- Jeśli `getUserId()` rzuca błąd → Next.js Error Boundary lub przekierowanie
- W praktyce: błąd powinien być obsłużony przez `error.tsx` lub przekierowanie w `try-catch`

---

## 4. SYSTEM AUTENTYKACJI

### 4.1 Integracja z Supabase Auth

#### 4.1.1 Konfiguracja Supabase Auth

**Plik konfiguracyjny:** `supabase/config.toml`

**Kluczowe ustawienia:**

```toml
[auth]
# Włączone metody autentykacji
enable_signup = true
enable_email_signup = true
enable_email_autoconfirm = true  # Automatyczne potwierdzenie (bez emaila)

# Wymagania hasła
password_min_length = 6

# Rate limiting
rate_limit_email_sent = 2  # Maksymalnie 2 emaile na godzinę
rate_limit_max_frequency = "1s"  # Minimalny odstęp między żądaniami

# Redirect URLs
site_url = "http://localhost:3000"  # Development
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
```

**Uwagi:**

- `enable_email_autoconfirm = true` → użytkownicy są automatycznie logowani po rejestracji
- Jeśli `enable_email_autoconfirm = false` → wymagane potwierdzenie emaila
- Aplikacja obsługuje oba scenariusze (sprawdzenie `data.session` w `RegisterForm`)

#### 4.1.2 Metody autentykacji

**Obsługiwane metody (zgodnie z PRD):**

- ✅ Email/Password (tradycyjny formularz)
- ❌ Google OAuth (nie używamy)
- ❌ GitHub OAuth (nie używamy)
- ❌ Inne zewnętrzne serwisy (nie używamy)

**Implementacja:**

1. **Logowanie:**

   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: "user@example.com",
     password: "password123",
   });
   ```

2. **Rejestracja:**

   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: "user@example.com",
     password: "password123",
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback`,
     },
   });
   ```

3. **Reset hasła:**

   ```typescript
   const { error } = await supabase.auth.resetPasswordForEmail(
     "user@example.com",
     {
       redirectTo: `${window.location.origin}/reset-password/confirm`,
     }
   );
   ```

4. **Wylogowanie:**
   ```typescript
   const { error } = await supabase.auth.signOut();
   ```

#### 4.1.3 Zarządzanie sesją

**Mechanizm:**

- Supabase Auth używa JWT tokens przechowywanych w cookies
- `@supabase/ssr` synchronizuje cookies między server a client
- Middleware odświeża sesję przed renderowaniem Server Components

**Cykl życia sesji:**

1. **Logowanie:**

   - `signInWithPassword()` zwraca `session` z access_token i refresh_token
   - Tokens zapisywane w cookies przez `@supabase/ssr`
   - Sesja ważna przez czas określony w konfiguracji Supabase

2. **Odświeżanie:**

   - Middleware wywołuje `getUser()` → automatyczne odświeżenie jeśli wygasła
   - `@supabase/ssr` zarządza refresh_token automatycznie

3. **Wylogowanie:**

   - `signOut()` usuwa tokens z cookies
   - Sesja unieważniona po stronie Supabase

4. **Wygasanie:**
   - Jeśli refresh_token wygasł → użytkownik musi się zalogować ponownie
   - `getUserId()` rzuca błąd → przekierowanie do `/login`

### 4.2 Callback dla resetu hasła

#### 4.2.1 Redirect URL

**Konfiguracja:**

- `redirectTo: /reset-password/confirm` w `resetPasswordForEmail()`
- URL musi być dodany do `additional_redirect_urls` w `config.toml`

**Uwaga:** W MVP widok `/reset-password/confirm` **nie jest zaimplementowany**. Użytkownik po kliknięciu linku w emailu zostanie przekierowany do domyślnego widoku Supabase lub do widoku logowania (zależnie od konfiguracji).

**Rekomendacja na przyszłość:**

- Implementacja widoku `/reset-password/confirm` do ustawienia nowego hasła
- Widok powinien:
  - Sprawdzić token z URL (hash fragment)
  - Wyświetlić formularz z polami: newPassword, confirmPassword
  - Wywołać `supabase.auth.updateUser({ password: newPassword })`
  - Przekierować do `/login` po sukcesie

### 4.3 Izolacja danych (RLS)

#### 4.3.1 Row Level Security

**Zasada:** Wszystkie tabele domenowe (exercises, workout_plans, workout_sessions, personal_records) mają włączone RLS z filtrem `user_id`.

**Implementacja w bazie danych:**

```sql
-- Przykład dla tabeli exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own exercises"
ON exercises FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own exercises"
ON exercises FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Analogicznie dla UPDATE i DELETE
```

**Weryfikacja w aplikacji:**

- Aplikacja nie może zakładać zaufania do danych po stronie klienta
- RLS egzekwuje dostęp niezależnie od UI
- Próba odczytu/edycji/usunięcia cudzych danych kończy się brakiem dostępu (brak danych lub błąd autoryzacji)

#### 4.3.2 Weryfikacja w API routes

**Zasada:** API routes używają `getUserId()` do pobrania `user_id` i używają go w zapytaniach.

**Przykład:**

```typescript
// src/app/api/exercises/route.ts
export async function GET() {
  const userId = await getUserId(); // Weryfikacja autoryzacji

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", userId); // Filtrowanie po user_id

  // RLS dodatkowo zabezpiecza przed manipulacją
}
```

**Uwaga:** Nawet jeśli API route używa `user_id`, RLS jest dodatkową warstwą bezpieczeństwa.

### 4.4 Bezpieczeństwo

#### 4.4.1 Ochrona przed atakami

**Zaimplementowane zabezpieczenia:**

1. **Rate limiting:**

   - Supabase Auth ogranicza liczbę żądań (2 emaile/godzinę dla resetu hasła)
   - Aplikacja obsługuje błędy rate limit z komunikatem użytkownika

2. **Ochrona przed wyciekiem informacji:**

   - Reset hasła zawsze zwraca pozytywny komunikat (nawet jeśli email nie istnieje)
   - Logowanie nie ujawnia, czy email istnieje (ogólny komunikat błędu)

3. **Walidacja po stronie klienta i serwera:**

   - Walidacja Zod po stronie klienta (UX)
   - Walidacja Supabase Auth po stronie serwera (bezpieczeństwo)

4. **HTTPS:**

   - Wymagane w produkcji (Vercel automatycznie używa HTTPS)
   - Cookies z flagą `Secure` w produkcji

5. **RLS:**
   - Izolacja danych na poziomie bazy danych
   - Niemożliwe odczytanie/edycja cudzych danych nawet przy manipulacji ID

#### 4.4.2 Best practices

**Zaimplementowane:**

- ✅ Używanie `@supabase/ssr` do zarządzania sesjami
- ✅ Server Components do weryfikacji autoryzacji
- ✅ RLS dla izolacji danych
- ✅ Walidacja po stronie klienta i serwera
- ✅ Obsługa błędów z bezpiecznymi komunikatami

**Rekomendacje na przyszłość:**

- Rozważenie implementacji CSRF protection (Supabase Auth ma wbudowaną ochronę)
- Monitoring błędów autentykacji (np. Sentry)
- Logowanie podejrzanych aktywności (np. wiele nieudanych prób logowania)

---

## 5. Wnioski i rekomendacje

### 5.1 Stan obecny

**Zaimplementowane:**

- ✅ Widoki logowania, rejestracji i resetu hasła
- ✅ Integracja z Supabase Auth przez `@supabase/ssr`
- ✅ Middleware do odświeżania sesji
- ✅ Funkcja `getUserId()` do weryfikacji autoryzacji
- ✅ Walidacja po stronie klienta (Zod)
- ✅ Obsługa błędów z bezpiecznymi komunikatami
- ✅ Nawigacja z przyciskiem logowania/wylogowania

**Do poprawy/rozszerzenia:**

1. **Widok potwierdzenia resetu hasła:**

   - Brak implementacji `/reset-password/confirm`
   - Użytkownik po kliknięciu linku w emailu nie może ustawić nowego hasła w aplikacji
   - **Rekomendacja:** Implementacja widoku z formularzem do ustawienia nowego hasła

2. **Obsługa błędów autoryzacji w Server Components:**

   - `getUserId()` rzuca błąd, ale nie ma centralnej obsługi przekierowania
   - **Rekomendacja:** Wrapper `requireAuth()` lub Error Boundary z przekierowaniem

3. **Callback dla rejestracji:**

   - `emailRedirectTo: /auth/callback` w `signUp()`, ale brak implementacji `/auth/callback`
   - **Rekomendacja:** Implementacja callback do obsługi potwierdzenia emaila (jeśli `enable_email_autoconfirm = false`)

4. **Testowanie:**
   - Brak testów jednostkowych dla hooków i komponentów
   - **Rekomendacja:** Dodanie testów dla `useLoginForm`, `useResetPasswordForm`, `RegisterForm`

### 5.2 Zgodność z wymaganiami PRD

**US-001: Rejestracja/logowanie przez Supabase Auth**

- ✅ Logowanie przez formularz email/password
- ✅ Rejestracja nowych użytkowników
- ✅ Reset hasła
- ✅ Przekierowanie po zalogowaniu do `/`
- ✅ Wylogowanie przez przycisk w nawigacji
- ✅ Funkcjonalności chronione (wymagają autoryzacji)
- ⚠️ Brak widoku potwierdzenia resetu hasła (do implementacji)

**US-002: Izolacja danych użytkowników (RLS)**

- ✅ RLS włączone w bazie danych (zgodnie z migracjami)
- ✅ Weryfikacja autoryzacji w Server Components przez `getUserId()`
- ✅ API routes używają `user_id` w zapytaniach
- ✅ RLS dodatkowo zabezpiecza przed manipulacją ID

**US-003: Sesja użytkownika i odświeżenie strony**

- ✅ Middleware odświeża sesję przed renderowaniem
- ✅ Użytkownik pozostaje zalogowany po odświeżeniu (jeśli sesja ważna)
- ⚠️ Brak automatycznego przekierowania do `/login` przy wygasłej sesji (wymaga implementacji w Error Boundary)

### 5.3 Architektura zgodna z Next.js 16

**Zastosowane wzorce:**

1. **Server Components dla stron:**

   - Weryfikacja autoryzacji po stronie serwera
   - Pobieranie danych przed renderowaniem

2. **Client Components dla formularzy:**

   - Interaktywność (walidacja, submit)
   - Integracja z Supabase Auth przez client-side API

3. **Middleware do odświeżania sesji:**

   - Synchronizacja cookies przed renderowaniem
   - Nie blokuje dostępu (weryfikacja w komponentach)

4. **Hooks do zarządzania stanem:**
   - `useLoginForm`, `useResetPasswordForm` dla logiki formularzy
   - Separacja logiki od komponentów UI

### 5.4 Rekomendacje na przyszłość

1. **Implementacja `/reset-password/confirm`:**

   - Widok do ustawienia nowego hasła po kliknięciu linku w emailu
   - Formularz z polami: newPassword, confirmPassword
   - Wywołanie `supabase.auth.updateUser({ password })`

2. **Implementacja `/auth/callback`:**

   - Obsługa callbacków z Supabase (potwierdzenie emaila, reset hasła)
   - Przekierowanie do odpowiedniej strony po weryfikacji

3. **Centralna obsługa błędów autoryzacji:**

   - Error Boundary z przekierowaniem do `/login`
   - Wrapper `requireAuth()` dla Server Components

4. **Ulepszenie UX:**

   - Loading states podczas logowania/rejestracji
   - Progress indicators dla długotrwałych operacji
   - Remember me functionality (jeśli wymagane)

5. **Testowanie:**
   - Testy jednostkowe dla hooków
   - Testy integracyjne dla przepływów autentykacji
   - Testy E2E dla scenariuszy użytkownika

---

## 6. Podsumowanie

Architektura modułu autentykacji jest zgodna z wymaganiami PRD i wykorzystuje najlepsze praktyki Next.js 16 oraz Supabase Auth. Widoki logowania, rejestracji i resetu hasła są zaimplementowane i działają poprawnie. System zapewnia bezpieczne uwierzytelnianie, izolację danych przez RLS oraz prawidłowe zarządzanie sesją użytkownika.

Główne obszary do rozszerzenia to implementacja widoku potwierdzenia resetu hasła oraz centralna obsługa błędów autoryzacji w Server Components. Architektura jest gotowa do dalszego rozwoju i łatwego dodawania nowych funkcjonalności związanych z autentykacją.
