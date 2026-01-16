# Plan implementacji integracji logowania z Supabase Auth

## Przegląd

Niniejszy dokument zawiera kompleksowy plan implementacji integracji logowania z backendem Next.js na podstawie specyfikacji `auth-spec.md`, wymagań PRD (US-001, US-002, US-003) oraz najlepszych praktyk Next.js 16 i Supabase Auth.

## Ustalenia z analizy technicznej

### Runda 1 - Podstawowe decyzje

1. **Implementacja "Remember Me"**
   - ✅ Decyzja: Ustawienie dłuższego `maxAge` dla cookies po logowaniu
   - ✅ Metoda: Helper modyfikujący cookies bezpośrednio po logowaniu (opcja A)
   - ✅ Czas trwania: 30 dni (2592000 sekund) dla `rememberMe = true`, domyślne ustawienia Supabase dla `rememberMe = false`

2. **Obsługa błędów autoryzacji w Server Components**
   - ✅ Decyzja: Wrapper `requireAuth()` + Error Boundary jako backup
   - ✅ Lokalizacja: `src/lib/auth.ts` (requireAuth) + `src/app/(app)/error.tsx` (Error Boundary)

3. **Synchronizacja stanu autentykacji po logowaniu**
   - ✅ Decyzja: `router.refresh()` + Zustand authStore
   - ✅ Kolejność: `setUser()` → `router.push("/")` → `router.refresh()`

4. **Walidacja i komunikaty błędów**
   - ✅ Decyzja: Centralizacja w helperze `mapAuthError()`
   - ✅ Lokalizacja: `src/lib/auth-errors.ts`
   - ✅ Zasady: Bezpieczne komunikaty, bez ujawniania istnienia konta

5. **Testowanie i weryfikacja**
   - ✅ Decyzja: Weryfikacja manualna na początku, testy automatyczne później
   - ✅ Środowisko: Lokalne Supabase z testowym użytkownikiem

### Runda 2 - Szczegóły implementacji

1. **Zustand authStore i AuthProvider**
   - ✅ Decyzja: Utworzenie store + AuthProvider zgodnie ze specyfikacją
   - ✅ Lokalizacja: `src/stores/auth-store.ts` + `src/components/auth/auth-provider.tsx`
   - ✅ Integracja: AuthProvider w `(app)/layout.tsx`, inicjalizacja store po logowaniu

2. **Implementacja "Remember Me" - szczegóły**
   - ✅ Decyzja: Opcja A - helper modyfikujący cookies po logowaniu
   - ✅ Lokalizacja: Helper w `src/lib/auth-cookies.ts` lub bezpośrednio w `use-login-form.ts`
   - ✅ Mechanizm: Modyfikacja `maxAge` dla cookies Supabase (`sb-*-auth-token`)

3. **requireAuth() i Error Boundary**
   - ✅ Decyzja: Wrapper `requireAuth()` w `src/lib/auth.ts` + Error Boundary w `src/app/(app)/error.tsx`
   - ✅ Funkcjonalność: Automatyczne przekierowanie do `/login` z komunikatem o wygasłej sesji

4. **Centralizacja mapowania błędów**
   - ✅ Decyzja: Helper `mapAuthError()` w `src/lib/auth-errors.ts`
   - ✅ Użycie: Wszystkie formularze autentykacji (login, register, reset password)

5. **Kolejność operacji po logowaniu**
   - ✅ Decyzja: `setUser(data.user)` → `router.push("/")` → `router.refresh()`
   - ✅ Uzasadnienie: Store aktualizuje się natychmiast, router odświeża Server Components

## Plan implementacji

### Krok 0: Ochrona routes (Priorytet: Wysoki - Pierwszy etap)

**Priorytet:** Wysoki - zalecane wykonanie jako pierwszy krok przed implementacją innych funkcjonalności autentykacji

**Dlaczego to jest ważne:**
- Bez ochrony routes, niezalogowani użytkownicy mogą uzyskać dostęp do chronionych stron
- Ochrona routes jest fundamentem bezpieczeństwa aplikacji
- Wszystkie inne funkcjonalności autentykacji (logowanie, sesja) wymagają ochrony tras, aby działać poprawnie

**Zakres pracy:**

1. **Ochrona wszystkich Server Components w `(app)` route group:**
   - Każda strona musi używać `getUserId()` lub `requireAuth()` do weryfikacji autoryzacji
   - Przekierowanie do `/login` przy braku sesji
   - Wzorzec: `try { await getUserId(); } catch { redirect("/login"); }`

2. **Ochrona Client Components:**
   - Client Components używają `useEffect` z `supabase.auth.getUser()`
   - Przekierowanie do `/login` jeśli użytkownik nie jest zalogowany

3. **Ochrona API routes:**
   - Wszystkie API routes muszą używać prawdziwej autoryzacji (nie `DEFAULT_USER_ID`)
   - Funkcja `getUserIdFromSession()` do pobierania ID użytkownika z sesji
   - Zwracanie błędu 401 (UNAUTHORIZED) przy braku autoryzacji

4. **Weryfikacja kompletności:**
   - Sprawdzenie wszystkich stron w `(app)` route group
   - Sprawdzenie wszystkich API routes
   - Testowanie prób dostępu bez autoryzacji

**Pliki do modyfikacji:**
- Wszystkie Server Components w `src/app/(app)/**/page.tsx`
- Wszystkie API routes w `src/app/api/**/route.ts`
- Client Components wymagające autoryzacji

**Wzorzec dla Server Components:**
```typescript
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

export default async function ProtectedPage() {
  try {
    await getUserId();
  } catch {
    redirect("/login");
  }
  
  // Renderowanie strony
}
```

**Wzorzec dla API Routes:**
```typescript
import { createClient } from "@/db/supabase.server";

async function getUserIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  
  return user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    // Logika endpointu
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Brak autoryzacji. Zaloguj się ponownie.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    // Obsługa innych błędów
  }
}
```

**Status:** ✅ Wysoki priorytet - zalecane wykonanie jako pierwszy krok

**Uwaga:** Ten krok jest ważny dla bezpieczeństwa aplikacji. Zalecane jest wykonanie go przed implementacją innych funkcjonalności autentykacji, aby zapewnić spójną ochronę wszystkich tras od początku.

---

### Krok 1: Utworzenie Zustand authStore

**Plik:** `src/stores/auth-store.ts`

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

**Status:** ✅ Do utworzenia

---

### Krok 2: Utworzenie AuthProvider

**Plik:** `src/components/auth/auth-provider.tsx`

**Funkcjonalność:**
- Client Component inicjalizujący authStore z danymi użytkownika z Server Component
- Subskrypcja zmian stanu autentykacji Supabase (`onAuthStateChange`)
- Synchronizacja store z sesją Supabase

**Status:** ✅ Do utworzenia

---

### Krok 3: Integracja AuthProvider w layout

**Plik:** `src/app/(app)/layout.tsx`

**Zmiany:**
- Dodanie `AuthProvider` jako wrapper dla `children`
- Przekazanie `user` z Server Component do AuthProvider

**Status:** ✅ Do modyfikacji

---

### Krok 4: Utworzenie helpera do mapowania błędów

**Plik:** `src/lib/auth-errors.ts`

**Funkcjonalność:**
- Funkcja `mapAuthError()` mapująca błędy Supabase Auth na komunikaty użytkownika
- Typy błędów: `email_not_confirmed`, `rate_limit`, `invalid_credentials`, `server_error`, `network_error`
- Zasady bezpieczeństwa: bez ujawniania istnienia konta

**Status:** ✅ Do utworzenia

---

### Krok 5: Aktualizacja use-login-form.ts

**Plik:** `src/hooks/use-login-form.ts`

**Zmiany:**
1. Import `mapAuthError()` z `auth-errors.ts`
2. Import `useAuthStore` z `auth-store.ts`
3. Implementacja "Remember Me":
   - Helper do ustawiania `maxAge` cookies po logowaniu
   - 30 dni dla `rememberMe = true`
4. Aktualizacja store po logowaniu: `setUser(data.user)`
5. Kolejność operacji: `setUser()` → `router.push("/")` → `router.refresh()`
6. Zastąpienie obecnego mapowania błędów wywołaniem `mapAuthError()`

**Status:** ✅ Do modyfikacji

---

### Krok 6: Utworzenie helpera requireAuth()

**Plik:** `src/lib/auth.ts`

**Zmiany:**
- Dodanie funkcji `requireAuth()` obok `getUserId()`
- Automatyczne przekierowanie do `/login?error=session_expired` przy braku sesji

**Status:** ✅ Do modyfikacji

---

### Krok 7: Utworzenie Error Boundary dla (app)

**Plik:** `src/app/(app)/error.tsx`

**Funkcjonalność:**
- Przechwytywanie błędów z Server Components w grupie `(app)`
- Wykrywanie błędów autoryzacji (sprawdzenie komunikatu błędu)
- Automatyczne przekierowanie do `/login` z odpowiednim komunikatem
- Fallback dla innych błędów

**Status:** ✅ Do utworzenia

---

### Krok 8: Helper do modyfikacji cookies (Remember Me)

**Plik:** `src/lib/auth-cookies.ts` (opcjonalnie, może być w `use-login-form.ts`)

**Funkcjonalność:**
- Funkcja `setRememberMeCookie(maxAge: number)` modyfikująca `maxAge` dla cookies Supabase
- Identyfikacja cookies: `sb-${projectRef}-auth-token` i powiązane
- Użycie: wywołanie po udanym logowaniu, jeśli `rememberMe = true`

**Status:** ✅ Do utworzenia (lub integracja w `use-login-form.ts`)

---

## Szczegóły techniczne

### Remember Me - implementacja cookies

**Mechanizm:**
1. Po udanym `signInWithPassword()`, jeśli `rememberMe = true`
2. Pobranie nazwy projektu Supabase z `NEXT_PUBLIC_SUPABASE_URL`
3. Modyfikacja `maxAge` dla wszystkich cookies związanych z autentykacją:
   - `sb-${projectRef}-auth-token`
   - `sb-${projectRef}-auth-token-code-verifier`
   - Inne cookies związane z sesją
4. Ustawienie `maxAge = 30 * 24 * 60 * 60` (30 dni w sekundach)

**Uwaga:** Cookies są zarządzane przez `@supabase/ssr`, więc modyfikacja musi być wykonana po stronie klienta po logowaniu.

### Synchronizacja authStore

**Przepływ:**
1. Server Component (`(app)/layout.tsx`) pobiera `user` przez `createClient()`
2. Przekazuje `user` jako props do `AuthProvider` (Client Component)
3. `AuthProvider` inicjalizuje store w `useEffect` przy montowaniu
4. `AuthProvider` subskrybuje `onAuthStateChange` dla aktualizacji w czasie rzeczywistym
5. Po logowaniu: `useLoginForm` wywołuje `setUser(data.user)` bezpośrednio

### Obsługa błędów autoryzacji

**Warstwy:**
1. **Server Components:** Używają `requireAuth()` zamiast `getUserId()` + try-catch
2. **Error Boundary:** Przechwytuje błędy z `requireAuth()` i przekierowuje do `/login`
3. **Fallback:** Jeśli Error Boundary nie zadziała, `requireAuth()` sam przekierowuje

**Komunikaty błędów:**
- `session_expired` → "Sesja wygasła. Zaloguj się ponownie."
- `unauthorized` → "Brak autoryzacji. Zaloguj się ponownie."

## Weryfikacja i testowanie

### Scenariusze do przetestowania manualnie

1. **Logowanie z Remember Me = false**
   - ✅ Sprawdzenie, że cookies mają standardowy `maxAge`
   - ✅ Sesja wygasa po zamknięciu przeglądarki (lub zgodnie z ustawieniami Supabase)

2. **Logowanie z Remember Me = true**
   - ✅ Sprawdzenie, że cookies mają `maxAge = 30 dni`
   - ✅ Sesja pozostaje aktywna po zamknięciu przeglądarki

3. **Odświeżenie strony po logowaniu**
   - ✅ Użytkownik pozostaje zalogowany
   - ✅ Server Components widzą zaktualizowaną sesję
   - ✅ authStore jest zsynchronizowany z sesją

4. **Wygasła sesja**
   - ✅ Próba dostępu do chronionej strony → przekierowanie do `/login`
   - ✅ Komunikat o wygasłej sesji

5. **Błędy logowania**
   - ✅ Nieprawidłowe dane → bezpieczny komunikat (bez ujawniania istnienia konta)
   - ✅ Email niepotwierdzony → komunikat o aktywacji
   - ✅ Rate limit → komunikat o zbyt wielu próbach
   - ✅ Błąd serwera → komunikat ogólny

## Zgodność z wymaganiami

### US-001: Rejestracja/logowanie przez Supabase Auth
- ✅ Formularz logowania email/password
- ✅ Checkbox "Zapamiętaj mnie" (Remember Me)
- ✅ Przedłużenie sesji dla Remember Me = true
- ✅ Przekierowanie po zalogowaniu do `/`
- ✅ Wylogowanie przez przycisk w nawigacji

### US-002: Izolacja danych użytkowników (RLS)
- ✅ RLS w bazie danych (już zaimplementowane)
- ✅ Weryfikacja autoryzacji w Server Components przez `requireAuth()`
- ✅ RLS dodatkowo zabezpiecza przed manipulacją ID

### US-003: Sesja użytkownika i odświeżenie strony
- ✅ Middleware odświeża sesję przed renderowaniem
- ✅ Użytkownik pozostaje zalogowany po odświeżeniu (jeśli sesja ważna)
- ✅ Automatyczne przekierowanie do `/login` przy wygasłej sesji

## Kolejność implementacji

**⚠️ WAŻNE:** Kolejność jest krytyczna dla bezpieczeństwa aplikacji!

### Etap 1: Fundament bezpieczeństwa (Wysoki priorytet)

1. **Krok 0:** Ochrona routes (Priorytet: Wysoki)
   - Ochrona wszystkich Server Components w `(app)` route group
   - Ochrona wszystkich API routes
   - Weryfikacja kompletności ochrony
   - Zalecane wykonanie jako pierwszy krok dla spójnej ochrony

### Etap 2: Podstawowa funkcjonalność autentykacji

2. ✅ **Krok 1-3:** Zustand authStore + AuthProvider + integracja w layout
3. ✅ **Krok 4:** Helper do mapowania błędów
4. ✅ **Krok 5:** Aktualizacja use-login-form.ts (błędy + Remember Me + store)
5. ✅ **Krok 6:** Helper requireAuth()
6. ✅ **Krok 7:** Error Boundary dla (app)
7. ✅ **Krok 8:** Helper do modyfikacji cookies (Remember Me)

## Uwagi implementacyjne

### Remember Me - alternatywne podejście

Jeśli bezpośrednia modyfikacja cookies okaże się problematyczna, można rozważyć:
- Konfigurację `persistSession` w kliencie Supabase
- Użycie localStorage do przechowywania flagi "Remember Me"
- Konfigurację w middleware (sprawdzanie flagi i ustawianie `maxAge`)

### Bezpieczeństwo

- ✅ Cookies z flagą `httpOnly` (zarządzane przez `@supabase/ssr`)
- ✅ Cookies z flagą `Secure` w produkcji (automatycznie przez Vercel)
- ✅ Cookies z flagą `SameSite` (zarządzane przez `@supabase/ssr`)
- ✅ Bez ujawniania istnienia konta w komunikatach błędów

### Wydajność

- ✅ authStore inicjalizowany tylko raz w `AuthProvider`
- ✅ Subskrypcja `onAuthStateChange` tylko w `AuthProvider`
- ✅ `router.refresh()` wywoływany tylko po logowaniu (nie przy każdym renderze)

## Wylogowanie (Logout)

### Obecny stan implementacji

**Status:** ✅ Częściowo zaimplementowane

**Lokalizacja:**
- `src/components/navigation/top-navigation.tsx` - przycisk wylogowania dla desktop
- `src/components/navigation/bottom-navigation.tsx` - przycisk wylogowania dla mobile
- `src/components/navigation/user-menu.tsx` - opcja wylogowania w menu użytkownika

**Obecna implementacja:**
```typescript
const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    toast.error("Nie udało się wylogować. Spróbuj ponownie.");
    return;
  }
  
  router.push("/login");
  router.refresh();
};
```

### Co wymaga poprawy

1. **Brak czyszczenia authStore**
   - ❌ Po wylogowaniu `authStore` nie jest czyszczony (`clearUser()`)
   - ✅ **Wymagane:** Wywołanie `clearUser()` z Zustand store po udanym `signOut()`

2. **Brak synchronizacji z onAuthStateChange**
   - ❌ `AuthProvider` powinien automatycznie czyścić store przy zmianie stanu autentykacji
   - ✅ **Wymagane:** Subskrypcja `onAuthStateChange` w `AuthProvider` z obsługą `SIGNED_OUT`

3. **Brak weryfikacji stanu przed wyświetleniem przycisku**
   - ✅ Przycisk wylogowania jest wyświetlany tylko gdy `user !== null` (już zaimplementowane)
   - ✅ Server Component w `(app)/layout.tsx` pobiera `user` i przekazuje do nawigacji

### Plan poprawy wylogowania

**Krok 9: Aktualizacja funkcji wylogowania**

**Pliki do modyfikacji:**
- `src/components/navigation/top-navigation.tsx`
- `src/components/navigation/bottom-navigation.tsx`
- `src/components/navigation/user-menu.tsx`

**Zmiany:**
1. Import `useAuthStore` z `auth-store.ts`
2. Wywołanie `clearUser()` po udanym `signOut()`
3. Kolejność operacji: `signOut()` → `clearUser()` → `router.push("/login")` → `router.refresh()`

**Implementacja:**
```typescript
import { useAuthStore } from "@/stores/auth-store";

const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  const clearUser = useAuthStore.getState().clearUser;
  
  if (error) {
    toast.error("Nie udało się wylogować. Spróbuj ponownie.");
    return;
  }
  
  // Wyczyść Zustand store
  clearUser();
  
  router.push("/login");
  router.refresh();
};
```

**Krok 10: Synchronizacja wylogowania w AuthProvider**

**Plik:** `src/components/auth/auth-provider.tsx`

**Funkcjonalność:**
- Subskrypcja `onAuthStateChange` w `useEffect`
- Obsługa eventu `SIGNED_OUT` - automatyczne wywołanie `clearUser()`
- Synchronizacja store z rzeczywistym stanem Supabase Auth

**Status:** ✅ Do implementacji w AuthProvider (Krok 2)

---

## Analiza luk bezpieczeństwa i niespójności

### Zidentyfikowane problemy

#### 1. ⚠️ Brak czyszczenia authStore przy wylogowaniu
**Ryzyko:** Niski (głównie UX)
**Opis:** Po wylogowaniu Zustand store nadal zawiera dane użytkownika, co może prowadzić do niespójności UI.
**Rozwiązanie:** Wywołanie `clearUser()` w funkcjach wylogowania (Krok 9)

#### 2. ⚠️ Middleware nie blokuje dostępu do chronionych tras
**Ryzyko:** Średni (zabezpieczone przez RLS i Server Components)
**Opis:** Middleware tylko odświeża sesję, ale nie blokuje dostępu. Ochrona odbywa się w Server Components przez `getUserId()`.
**Status:** ✅ Zgodne z architekturą projektu (weryfikacja w komponentach)
**Uwaga:** To nie jest luka - to zamierzone podejście zgodne z `auth-spec.md`. Ochrona routes (Krok 0) powinna być zaimplementowana, aby middleware + weryfikacja w komponentach działały poprawnie.

#### 3. ⚠️ Brak Error Boundary dla błędów autoryzacji
**Ryzyko:** Średni (UX)
**Opis:** Jeśli `getUserId()` rzuca błąd w Server Component, nie ma centralnej obsługi przekierowania.
**Rozwiązanie:** Implementacja Error Boundary (Krok 7) + wrapper `requireAuth()` (Krok 6)

#### 4. ⚠️ Brak walidacji tokenu w reset-password/confirm
**Ryzyko:** Średni (funkcjonalność)
**Opis:** Widok `/reset-password/confirm` nie weryfikuje tokenu z URL przed wyświetleniem formularza.
**Status:** ⏳ Do implementacji (wymienione w `ui-auth.md` jako backend do implementacji)

#### 5. ⚠️ Remember Me - modyfikacja cookies po stronie klienta
**Ryzyko:** Niski (funkcjonalność)
**Opis:** Modyfikacja `maxAge` cookies po logowaniu może być problematyczna, jeśli cookies są `httpOnly`.
**Uwaga:** `@supabase/ssr` zarządza cookies automatycznie - może być konieczne alternatywne podejście
**Rozwiązanie:** Sprawdzenie, czy cookies są dostępne do modyfikacji po stronie klienta

#### 6. ✅ RLS zabezpiecza dane niezależnie od UI
**Status:** ✅ Zaimplementowane
**Opis:** Row Level Security w Supabase zapewnia izolację danych na poziomie bazy, niezależnie od weryfikacji w aplikacji.

#### 7. ⚠️ Brak walidacji sesji w Client Components
**Ryzyko:** Niski (głównie UX)
**Opis:** Client Components używają `authStore` do sprawdzania autoryzacji, ale store może być niezsynchronizowany z rzeczywistą sesją.
**Rozwiązanie:** `AuthProvider` z subskrypcją `onAuthStateChange` zapewni synchronizację (Krok 2)

#### 8. ⚠️ DEFAULT_USER_ID jako fallback w development
**Ryzyko:** Średni (tylko w development)
**Opis:** `getUserId()` używa `DEFAULT_USER_ID` jako fallback w development, co może maskować problemy z autentykacją.
**Status:** ✅ Zamierzone dla developmentu, ale wymaga dokumentacji
**Uwaga:** W produkcji `DEFAULT_USER_ID` nie powinien być ustawiony

### Rekomendacje bezpieczeństwa

1. **Ochrona routes (Krok 0) - Wysoki priorytet**
   - Ochrona routes jest fundamentem bezpieczeństwa
   - Zalecane wykonanie przed innymi krokami dla spójnej ochrony
   - Weryfikacja wszystkich Server Components i API routes

2. **Wdrożyć wszystkie kroki z planu implementacji**
   - Error Boundary (Krok 7)
   - requireAuth() wrapper (Krok 6)
   - Czyszczenie authStore przy wylogowaniu (Krok 9)

2. **✅ Dodać walidację tokenu w `/reset-password/confirm`**
   - Weryfikacja tokenu w Server Component przed renderowaniem formularza
   - Przekierowanie do `/reset-password` jeśli token nieprawidłowy

3. **✅ Zweryfikować implementację Remember Me**
   - Sprawdzenie, czy cookies są dostępne do modyfikacji po stronie klienta
   - Rozważenie alternatywnego podejścia (konfiguracja w middleware lub Supabase)

4. **✅ Dodać monitoring błędów autoryzacji**
   - Logowanie prób dostępu do chronionych tras bez autoryzacji
   - Monitoring wygasłych sesji

5. **✅ Dokumentacja DEFAULT_USER_ID**
   - Wyraźne oznaczenie, że jest tylko dla developmentu
   - Sprawdzenie, że nie jest ustawiony w produkcji

### Podsumowanie luk

**Krytyczne:** Brak
**Wysokie:** Brak
**Średnie:** 4 (Error Boundary, walidacja tokenu, Remember Me, DEFAULT_USER_ID)
**Niskie:** 2 (czyszczenie store, walidacja w Client Components)

**Ogólna ocena:** System autentykacji jest dobrze zaprojektowany z RLS jako główną warstwą bezpieczeństwa. Zidentyfikowane problemy dotyczą głównie UX i kompletności implementacji, a nie fundamentalnych luk bezpieczeństwa.

---

## Podsumowanie

Plan implementacji obejmuje:
- **Krok 0 (Wysoki priorytet):** Ochrona routes - fundament bezpieczeństwa
- ✅ 10 kroków implementacji (8 podstawowych + 2 dla wylogowania)
- ✅ Integrację Zustand authStore z Supabase Auth
- ✅ Implementację "Remember Me" z modyfikacją cookies
- ✅ Centralizację obsługi błędów autentykacji
- ✅ Automatyczne przekierowanie przy wygasłej sesji
- ✅ Poprawę wylogowania z czyszczeniem authStore
- ✅ Zgodność z wymaganiami PRD (US-001, US-002, US-003)

**Uwaga:** Krok 0 (ochrona routes) ma wysoki priorytet i zalecane jest wykonanie go jako pierwszego, aby zapewnić spójną ochronę wszystkich tras od początku implementacji autoryzacji.

**Zidentyfikowane luki:** 6 problemów (4 średnie, 2 niskie) - wszystkie mają rozwiązania w planie implementacji.

Wszystkie decyzje techniczne zostały podjęte zgodnie z najlepszymi praktykami Next.js 16, Supabase Auth i React 19.
