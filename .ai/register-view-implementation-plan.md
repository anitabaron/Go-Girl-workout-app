# Plan implementacji widoku Rejestracji

## 1. Przegląd

Widok rejestracji (`/register`) umożliwia użytkowniczce utworzenie nowego konta w aplikacji Go Girl Workout App. Widok zawiera formularz z polami email, password i confirm password, wraz z walidacją po stronie klienta zgodną z wymaganiami Supabase Auth. Po udanej rejestracji użytkowniczka otrzymuje informację o konieczności potwierdzenia emaila (jeśli włączone w konfiguracji Supabase) lub jest automatycznie logowana i przekierowywana do głównego widoku aplikacji.

## 2. Routing widoku

- **Ścieżka**: `/register`
- **Plik**: `src/app/register/page.tsx`
- **Typ**: Server Component (layout) z Client Component (formularz)
- **Ochrona**: Middleware nie blokuje dostępu (widok publiczny), ale przekierowuje zalogowanych użytkowników do `/` lub `/exercises`

## 3. Struktura komponentów

```
RegisterPage (Server Component)
└── RegisterForm (Client Component)
    ├── EmailInput
    ├── PasswordInput
    │   └── PasswordStrengthIndicator (opcjonalny)
    ├── ConfirmPasswordInput
    ├── PasswordRequirements (opcjonalny, informacyjny)
    ├── SubmitButton
    └── LoginLink
```

## 4. Szczegóły komponentów

### RegisterPage (Server Component)

**Opis komponentu**: Główny komponent strony rejestracji. Renderuje layout strony z tytułem, opisem i formularzem rejestracji. Sprawdza, czy użytkowniczka jest już zalogowana i przekierowuje ją, jeśli tak.

**Główne elementy**:
- `<main>` element z semantycznym znacznikiem
- `<h1>` z tytułem "Utwórz konto"
- `<p>` z opisem lub instrukcją
- `RegisterForm` - główny formularz rejestracji
- Link do strony logowania (`/login`)

**Obsługiwane zdarzenia**: Brak (Server Component)

**Obsługiwana walidacja**: Brak (walidacja w komponencie formularza)

**Typy**: Brak props (komponent strony)

**Props**: Brak

### RegisterForm (Client Component)

**Opis komponentu**: Główny komponent formularza rejestracji odpowiedzialny za zarządzanie stanem formularza, walidację po stronie klienta (Zod), obsługę submit, integrację z Supabase Auth oraz wyświetlanie komunikatów błędów i sukcesu.

**Główne elementy**:
- `<form>` element z `onSubmit` handler
- `EmailInput` - pole email z walidacją
- `PasswordInput` - pole hasła z możliwością pokazania/ukrycia i wskaźnikiem siły
- `ConfirmPasswordInput` - pole potwierdzenia hasła z walidacją zgodności
- `PasswordRequirements` - informacja o wymaganiach hasła (opcjonalny, zawsze widoczny lub tylko przy błędach)
- `SubmitButton` - przycisk "Zarejestruj się" z loading state
- `LoginLink` - link "Masz już konto? Zaloguj się"

**Obsługiwane zdarzenia**:
- `onSubmit` - walidacja i wysłanie żądania do Supabase Auth
- `onChange` - aktualizacja stanu formularza i walidacja w czasie rzeczywistym
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:
- Walidacja po stronie klienta (Zod) przed wysłaniem:
  - `email`: wymagane, string, format email (z.string().email())
  - `password`: wymagane, string, min 6 znaków (zgodnie z konfiguracją Supabase: minimum_password_length = 6)
  - `confirmPassword`: wymagane, string, musi być identyczne z `password` (z.string().refine())
- Reguły biznesowe:
  - Hasło musi mieć minimum 6 znaków (zgodnie z konfiguracją Supabase)
  - Hasło i potwierdzenie hasła muszą być identyczne
  - Email musi być w poprawnym formacie

**Typy**:
- Stan: `RegisterFormState` (ViewModel)
- Używa: Supabase Auth API (`supabase.auth.signUp()`)

**Props**: Brak

### EmailInput (Client Component)

**Opis komponentu**: Komponent pola input dla adresu email z walidacją inline i wyświetlaniem błędów.

**Główne elementy**:
- `<input type="email">` z odpowiednimi atrybutami dostępności
- `<label>` dla pola email
- `<span>` z komunikatem błędu (jeśli występuje)
- Ikona email (opcjonalnie)

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja wartości i walidacja
- `onBlur` - walidacja po opuszczeniu pola
- `onFocus` - wyczyszczenie błędu (opcjonalnie)

**Obsługiwana walidacja**:
- Format email (z.string().email())
- Pole wymagane (z.string().min(1))
- Wyświetlanie błędów inline pod polem
- `aria-invalid="true"` dla pola z błędem
- `aria-describedby` wskazujące na element z komunikatem błędu

**Typy**:
- Props: `EmailInputProps`
- Używa: `RegisterFormState` (ViewModel)

**Props**:
- `value: string` - wartość pola
- `error?: string` - komunikat błędu
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler opuszczenia pola
- `disabled: boolean` - czy pole jest zablokowane (podczas zapisu)

### PasswordInput (Client Component)

**Opis komponentu**: Komponent pola input dla hasła z możliwością pokazania/ukrycia hasła, wskaźnikiem siły hasła (opcjonalny) i walidacją inline.

**Główne elementy**:
- `<input type="password" | "text">` z przełączaniem typu
- `<label>` dla pola hasła
- Przycisk/link do pokazania/ukrycia hasła (ikona oka)
- `PasswordStrengthIndicator` - wskaźnik siły hasła (opcjonalny)
- `<span>` z komunikatem błędu (jeśli występuje)

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja wartości i walidacja
- `onBlur` - walidacja po opuszczeniu pola
- `onToggleVisibility` - przełączanie widoczności hasła

**Obsługiwana walidacja**:
- Minimum 6 znaków (z.string().min(6))
- Pole wymagane (z.string().min(1))
- Wyświetlanie błędów inline pod polem
- `aria-invalid="true"` dla pola z błędem
- `aria-describedby` wskazujące na element z komunikatem błędu

**Typy**:
- Props: `PasswordInputProps`
- Używa: `RegisterFormState` (ViewModel)

**Props**:
- `value: string` - wartość pola
- `error?: string` - komunikat błędu
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler opuszczenia pola
- `disabled: boolean` - czy pole jest zablokowane (podczas zapisu)
- `showStrengthIndicator?: boolean` - czy pokazać wskaźnik siły hasła

### PasswordStrengthIndicator (Client Component, opcjonalny)

**Opis komponentu**: Komponent wyświetlający wizualny wskaźnik siły hasła (słabe/średnie/silne) na podstawie długości i złożoności hasła.

**Główne elementy**:
- Pasek postępu lub wskaźnik wizualny (np. 3 poziomy: słabe/średnie/silne)
- Etykieta tekstowa z opisem siły hasła
- Kolory wskaźnika (czerwony/żółty/zielony)

**Obsługiwane zdarzenia**: Brak

**Obsługiwana walidacja**: Brak (tylko wizualizacja)

**Typy**:
- Props: `PasswordStrengthIndicatorProps`

**Props**:
- `password: string` - hasło do analizy

### ConfirmPasswordInput (Client Component)

**Opis komponentu**: Komponent pola input dla potwierdzenia hasła z walidacją zgodności z hasłem i możliwością pokazania/ukrycia.

**Główne elementy**:
- `<input type="password" | "text">` z przełączaniem typu
- `<label>` dla pola potwierdzenia hasła
- Przycisk/link do pokazania/ukrycia hasła (ikona oka)
- `<span>` z komunikatem błędu (jeśli występuje)

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja wartości i walidacja zgodności
- `onBlur` - walidacja po opuszczeniu pola
- `onToggleVisibility` - przełączanie widoczności hasła

**Obsługiwana walidacja**:
- Zgodność z hasłem (z.string().refine((val) => val === password))
- Pole wymagane (z.string().min(1))
- Wyświetlanie błędów inline pod polem
- `aria-invalid="true"` dla pola z błędem
- `aria-describedby` wskazujące na element z komunikatem błędu

**Typy**:
- Props: `ConfirmPasswordInputProps`
- Używa: `RegisterFormState` (ViewModel)

**Props**:
- `value: string` - wartość pola
- `password: string` - wartość pola hasła (do porównania)
- `error?: string` - komunikat błędu
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler opuszczenia pola
- `disabled: boolean` - czy pole jest zablokowane (podczas zapisu)

### PasswordRequirements (Client Component, opcjonalny)

**Opis komponentu**: Komponent wyświetlający listę wymagań dotyczących hasła (informacyjny, zawsze widoczny lub tylko przy błędach).

**Główne elementy**:
- `<ul>` z listą wymagań
- Każde wymaganie jako `<li>` z ikoną (✓ lub ✗) w zależności od spełnienia
- Wymagania:
  - Minimum 6 znaków (zgodnie z konfiguracją Supabase)

**Obsługiwane zdarzenia**: Brak

**Obsługiwana walidacja**: Brak (tylko informacyjny)

**Typy**:
- Props: `PasswordRequirementsProps`

**Props**:
- `password: string` - hasło do analizy

### SubmitButton (Client Component)

**Opis komponentu**: Przycisk submit formularza z loading state i wyłączaniem podczas przetwarzania.

**Główne elementy**:
- `<button type="submit">` z odpowiednimi atrybutami
- Tekst "Zarejestruj się"
- Spinner/loader podczas ładowania (opcjonalnie)
- Wyłączenie przycisku podczas przetwarzania

**Obsługiwane zdarzenia**:
- `onClick` - wywołanie submit formularza (jeśli walidacja przechodzi)

**Obsługiwana walidacja**: Brak (walidacja w formularzu)

**Typy**:
- Props: `SubmitButtonProps`

**Props**:
- `isLoading: boolean` - czy formularz jest w trakcie przetwarzania
- `disabled: boolean` - czy przycisk jest wyłączony

### LoginLink (Client Component)

**Opis komponentu**: Link do strony logowania dla użytkowniczek, które już mają konto.

**Główne elementy**:
- `<Link>` do `/login`
- Tekst "Masz już konto? Zaloguj się"

**Obsługiwane zdarzenia**: Brak (tylko nawigacja)

**Obsługiwana walidacja**: Brak

**Typy**: Brak props

**Props**: Brak

## 5. Typy

### RegisterFormState (ViewModel)

ViewModel reprezentujący stan formularza rejestracji:

```typescript
type RegisterFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};
```

**Pola**:
- `email: string` - adres email użytkowniczki
- `password: string` - hasło użytkowniczki
- `confirmPassword: string` - potwierdzenie hasła

### RegisterFormErrors

Typ reprezentujący błędy walidacji formularza:

```typescript
type RegisterFormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  _form?: string[]; // Błędy na poziomie formularza (np. z API)
};
```

**Pola**:
- `email?: string` - komunikat błędu dla pola email
- `password?: string` - komunikat błędu dla pola hasła
- `confirmPassword?: string` - komunikat błędu dla pola potwierdzenia hasła
- `_form?: string[]` - błędy na poziomie formularza (np. błędy z Supabase Auth)

### RegisterFormProps

Typ props dla komponentu RegisterForm (obecnie brak, ale może być rozszerzony w przyszłości):

```typescript
type RegisterFormProps = {
  // Obecnie brak props, ale może być rozszerzony o:
  // redirectTo?: string; // Opcjonalne przekierowanie po rejestracji
};
```

### Supabase Auth Response Types

Typy odpowiedzi z Supabase Auth API:

```typescript
// Typ odpowiedzi z supabase.auth.signUp()
type AuthResponse = {
  data: {
    user: User | null;
    session: Session | null;
  } | null;
  error: AuthError | null;
};

// Typ błędu autoryzacji
type AuthError = {
  message: string;
  status?: number;
};
```

## 6. Zarządzanie stanem

Widok rejestracji używa lokalnego stanu React (useState) do zarządzania stanem formularza i błędami walidacji. Nie jest wymagany custom hook ani zewnętrzne zarządzanie stanem (Zustand), ponieważ:

1. Stan formularza jest prosty i lokalny dla tego widoku
2. Nie ma potrzeby współdzielenia stanu między komponentami
3. Stan nie wymaga trwałości (persistence)

**Zmienne stanu**:
- `formState: RegisterFormState` - stan formularza (email, password, confirmPassword)
- `errors: RegisterFormErrors` - błędy walidacji per pole
- `isLoading: boolean` - stan ładowania podczas przetwarzania rejestracji
- `isPasswordVisible: boolean` - widoczność hasła w polu password
- `isConfirmPasswordVisible: boolean` - widoczność hasła w polu confirmPassword

**Custom hook (opcjonalny)**: `useRegisterForm` - hook do zarządzania logiką formularza, walidacją i integracją z Supabase Auth. Hook może być użyty do:
- Zarządzania stanem formularza
- Walidacji pól (Zod)
- Obsługi submit
- Integracji z Supabase Auth
- Obsługi błędów i sukcesu

## 7. Integracja API

Widok rejestracji integruje się bezpośrednio z Supabase Auth API przez klienta przeglądarkowego (`supabase` z `@/db/supabase.client`). Nie jest wymagany dedykowany endpoint API route, ponieważ Supabase Auth obsługuje rejestrację bezpośrednio z klienta.

**Wywołanie API**:
- `supabase.auth.signUp({ email, password })` - rejestracja nowego użytkownika

**Typy żądania**:
```typescript
type SignUpRequest = {
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string; // URL przekierowania po potwierdzeniu emaila
    data?: Record<string, unknown>; // Dodatkowe metadane użytkownika
  };
};
```

**Typy odpowiedzi**:
```typescript
type SignUpResponse = {
  data: {
    user: User | null;
    session: Session | null;
  } | null;
  error: AuthError | null;
};
```

**Obsługa odpowiedzi**:
- **Sukces**: 
  - Jeśli `enable_confirmations = false` w konfiguracji Supabase: użytkowniczka jest automatycznie zalogowana, sesja jest ustawiona, przekierowanie do `/` lub `/exercises`
  - Jeśli `enable_confirmations = true`: wyświetlenie toast notification z informacją o konieczności potwierdzenia emaila, przekierowanie do `/login` z komunikatem
- **Błąd**: 
  - Wyświetlenie toast notification z komunikatem błędu
  - Wyświetlenie błędów inline w formularzu (jeśli dotyczy konkretnych pól)
  - Obsługa typowych błędów:
    - `User already registered` - email już istnieje
    - `Password too weak` - hasło nie spełnia wymagań
    - `Invalid email` - nieprawidłowy format email
    - Błędy sieciowe - komunikaty o problemach z połączeniem

## 8. Interakcje użytkownika

### 8.1 Wypełnianie formularza

1. Użytkowniczka wprowadza email w pole `EmailInput`
   - Walidacja formatu email w czasie rzeczywistym (opcjonalnie) lub po `onBlur`
   - Wyświetlenie błędu inline, jeśli format jest nieprawidłowy

2. Użytkowniczka wprowadza hasło w pole `PasswordInput`
   - Aktualizacja wskaźnika siły hasła (jeśli włączony)
   - Walidacja minimalnej długości (6 znaków) po `onBlur`
   - Możliwość pokazania/ukrycia hasła przez kliknięcie ikony oka

3. Użytkowniczka wprowadza potwierdzenie hasła w pole `ConfirmPasswordInput`
   - Walidacja zgodności z hasłem w czasie rzeczywistym lub po `onBlur`
   - Wyświetlenie błędu inline, jeśli hasła nie są identyczne
   - Możliwość pokazania/ukrycia hasła przez kliknięcie ikony oka

### 8.2 Przesłanie formularza

1. Użytkowniczka klika przycisk "Zarejestruj się"
   - Walidacja wszystkich pól przed wysłaniem
   - Jeśli walidacja nie przechodzi: wyświetlenie błędów, brak wysłania żądania
   - Jeśli walidacja przechodzi: wyłączenie przycisku, ustawienie `isLoading = true`, wysłanie żądania do Supabase Auth

2. Po otrzymaniu odpowiedzi z API:
   - **Sukces**: 
     - Wyświetlenie toast notification z komunikatem sukcesu
     - Jeśli `enable_confirmations = false`: automatyczne logowanie i przekierowanie do `/` lub `/exercises`
     - Jeśli `enable_confirmations = true`: wyświetlenie komunikatu o konieczności potwierdzenia emaila i przekierowanie do `/login`
   - **Błąd**: 
     - Wyświetlenie toast notification z komunikatem błędu
     - Wyświetlenie błędów inline w formularzu (jeśli dotyczy konkretnych pól)
     - Włączenie przycisku, ustawienie `isLoading = false`

### 8.3 Nawigacja

1. Użytkowniczka klika link "Masz już konto? Zaloguj się"
   - Przekierowanie do `/login`

2. Jeśli użytkowniczka jest już zalogowana i próbuje wejść na `/register`:
   - Middleware lub Server Component przekierowuje do `/` lub `/exercises`

## 9. Warunki i walidacja

### 9.1 Walidacja po stronie klienta (Zod)

**Email**:
- Wymagane pole (z.string().min(1, "Email jest wymagany"))
- Format email (z.string().email("Nieprawidłowy format email"))
- Trim wartości przed walidacją

**Password**:
- Wymagane pole (z.string().min(1, "Hasło jest wymagane"))
- Minimum 6 znaków (z.string().min(6, "Hasło musi mieć minimum 6 znaków"))
- Trim wartości przed walidacją (opcjonalnie, hasła zwykle nie są trimowane)

**Confirm Password**:
- Wymagane pole (z.string().min(1, "Potwierdzenie hasła jest wymagane"))
- Zgodność z hasłem (z.string().refine((val) => val === password, "Hasła nie są identyczne"))
- Trim wartości przed walidacją (opcjonalnie)

### 9.2 Walidacja po stronie serwera (Supabase Auth)

Supabase Auth wykonuje własną walidację zgodnie z konfiguracją:
- `minimum_password_length = 6` (zgodnie z konfiguracją w `supabase/config.toml`)
- `password_requirements = ""` (obecnie brak dodatkowych wymagań)
- Format email (walidacja po stronie Supabase)
- Unikalność email (sprawdzenie, czy użytkownik już istnieje)

### 9.3 Wpływ walidacji na stan interfejsu

- **Błędy walidacji pól**: Wyświetlenie komunikatu błędu pod polem, ustawienie `aria-invalid="true"`, wyłączenie przycisku submit
- **Błędy z API**: Wyświetlenie toast notification i błędów inline (jeśli dotyczy konkretnych pól)
- **Sukces**: Wyświetlenie toast notification, przekierowanie do odpowiedniego widoku

## 10. Obsługa błędów

### 10.1 Błędy walidacji po stronie klienta

- **Nieprawidłowy format email**: Wyświetlenie komunikatu "Nieprawidłowy format email" pod polem email
- **Hasło za krótkie**: Wyświetlenie komunikatu "Hasło musi mieć minimum 6 znaków" pod polem hasła
- **Hasła nie są identyczne**: Wyświetlenie komunikatu "Hasła nie są identyczne" pod polem potwierdzenia hasła
- **Puste pola**: Wyświetlenie komunikatu "Pole jest wymagane" pod odpowiednim polem

### 10.2 Błędy z Supabase Auth API

- **User already registered** (email już istnieje):
  - Toast notification: "Konto z tym adresem email już istnieje. Zaloguj się lub zresetuj hasło."
  - Błąd inline pod polem email: "Konto z tym adresem email już istnieje"

- **Password too weak** (hasło nie spełnia wymagań):
  - Toast notification: "Hasło nie spełnia wymagań. Upewnij się, że ma minimum 6 znaków."
  - Błąd inline pod polem hasła: "Hasło nie spełnia wymagań"

- **Invalid email** (nieprawidłowy format email):
  - Toast notification: "Nieprawidłowy format email."
  - Błąd inline pod polem email: "Nieprawidłowy format email"

- **Network error** (błąd sieciowy):
  - Toast notification: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
  - Włączenie przycisku submit, ustawienie `isLoading = false`

- **Unknown error** (nieznany błąd):
  - Toast notification: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie później."
  - Logowanie błędu do konsoli (w trybie deweloperskim)

### 10.3 Przypadki brzegowe

- **Użytkowniczka już zalogowana**: Przekierowanie do `/` lub `/exercises` (obsługa w Server Component lub middleware)
- **Sesja wygasła podczas rejestracji**: Obsługa przez Supabase Auth (automatyczne odświeżenie sesji)
- **Odświeżenie strony podczas rejestracji**: Formularz jest resetowany, użytkowniczka musi wypełnić ponownie
- **Brak połączenia z internetem**: Wyświetlenie komunikatu o braku połączenia, możliwość ponowienia próby

## 11. Kroki implementacji

1. **Utworzenie struktury plików**:
   - Utworzenie pliku `src/app/register/page.tsx` (Server Component)
   - Utworzenie pliku `src/components/auth/register-form.tsx` (Client Component)
   - Utworzenie plików dla komponentów pomocniczych (opcjonalnie):
     - `src/components/auth/email-input.tsx`
     - `src/components/auth/password-input.tsx`
     - `src/components/auth/confirm-password-input.tsx`
     - `src/components/auth/password-strength-indicator.tsx` (opcjonalny)
     - `src/components/auth/password-requirements.tsx` (opcjonalny)

2. **Definicja typów**:
   - Utworzenie pliku `src/types/auth.ts` z typami:
     - `RegisterFormState`
     - `RegisterFormErrors`
     - `RegisterFormProps` (jeśli potrzebne)

3. **Implementacja schematu walidacji Zod**:
   - Utworzenie pliku `src/lib/validation/register-form.ts` z schematem walidacji:
     - Schemat dla email (wymagany, format email)
     - Schemat dla password (wymagany, min 6 znaków)
     - Schemat dla confirmPassword (wymagany, zgodność z password)
     - Funkcja walidacji całego formularza

4. **Implementacja custom hook (opcjonalny)**:
   - Utworzenie pliku `src/hooks/use-register-form.ts` z logiką:
     - Zarządzanie stanem formularza
     - Walidacja pól (Zod)
     - Obsługa submit
     - Integracja z Supabase Auth
     - Obsługa błędów i sukcesu

5. **Implementacja komponentu RegisterPage**:
   - Sprawdzenie, czy użytkowniczka jest zalogowana (przekierowanie, jeśli tak)
   - Renderowanie layoutu strony z tytułem i opisem
   - Renderowanie komponentu `RegisterForm`
   - Renderowanie linku do logowania

6. **Implementacja komponentu RegisterForm**:
   - Zarządzanie stanem formularza (useState)
   - Zarządzanie błędami walidacji (useState)
   - Zarządzanie stanem ładowania (useState)
   - Zarządzanie widocznością haseł (useState)
   - Implementacja walidacji pól (Zod)
   - Implementacja handlerów onChange i onBlur
   - Implementacja handlera onSubmit z integracją Supabase Auth
   - Obsługa odpowiedzi z API (sukces/błąd)
   - Renderowanie pól formularza z komponentami pomocniczymi
   - Renderowanie przycisku submit z loading state
   - Renderowanie linku do logowania

7. **Implementacja komponentów pomocniczych**:
   - `EmailInput`: pole input z walidacją i wyświetlaniem błędów
   - `PasswordInput`: pole input z przełączaniem widoczności i wskaźnikiem siły (opcjonalny)
   - `ConfirmPasswordInput`: pole input z walidacją zgodności i przełączaniem widoczności
   - `PasswordStrengthIndicator`: wizualny wskaźnik siły hasła (opcjonalny)
   - `PasswordRequirements`: lista wymagań hasła (opcjonalny)
   - `SubmitButton`: przycisk submit z loading state
   - `LoginLink`: link do strony logowania

8. **Integracja z Supabase Auth**:
   - Użycie klienta `supabase` z `@/db/supabase.client`
   - Wywołanie `supabase.auth.signUp({ email, password })`
   - Obsługa odpowiedzi (sukces/błąd)
   - Obsługa konfiguracji `enable_confirmations` (przekierowanie lub automatyczne logowanie)

9. **Implementacja obsługi błędów**:
   - Mapowanie błędów z Supabase Auth na komunikaty po polsku
   - Wyświetlanie toast notifications dla błędów
   - Wyświetlanie błędów inline w formularzu
   - Obsługa błędów sieciowych

10. **Implementacja dostępności (a11y)**:
    - Dodanie ARIA labels dla wszystkich pól formularza
    - Dodanie `aria-invalid` i `aria-describedby` dla pól z błędami
    - Dodanie `aria-live` dla dynamicznych komunikatów błędów
    - Zarządzanie focus (automatyczne ustawienie focus na pierwsze pole przy załadowaniu)
    - Obsługa nawigacji klawiaturą

11. **Stylizacja komponentów**:
    - Użycie komponentów shadcn/ui (Input, Button, Label)
    - Stylizacja zgodna z design system aplikacji
    - Responsywność (mobile-first)
    - Dark mode support (jeśli włączony)

12. **Testowanie**:
    - Testowanie walidacji pól (email, password, confirmPassword)
    - Testowanie rejestracji z poprawnymi danymi
    - Testowanie rejestracji z niepoprawnymi danymi
    - Testowanie obsługi błędów z API
    - Testowanie przekierowań (po sukcesie, jeśli zalogowana)
    - Testowanie dostępności (screen reader, nawigacja klawiaturą)

13. **Dokumentacja**:
    - Dodanie komentarzy JSDoc do komponentów i funkcji
    - Aktualizacja dokumentacji projektu (jeśli istnieje)
