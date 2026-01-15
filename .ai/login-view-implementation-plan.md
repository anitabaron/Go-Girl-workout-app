# Plan implementacji widoku logowania

## 1. Przegląd

Widok logowania (`/login`) umożliwia użytkowniczce zalogowanie się do aplikacji Go Girl Workout App przy użyciu tradycyjnego formularza email/password z integracją Supabase Auth. Widok jest dostępny dla niezalogowanych użytkowniczek i zapewnia bezpieczne uwierzytelnianie z walidacją po stronie klienta, obsługą błędów oraz przekierowaniem po udanym logowaniu.

Główny cel widoku to umożliwienie dostępu do prywatnych danych użytkowniczki (ćwiczenia, plany treningowe, sesje, rekordy) poprzez bezpieczne uwierzytelnianie zgodnie z wymaganiami US-001, US-002 i US-003 z PRD.

## 2. Routing widoku

- **Ścieżka**: `/login`
- **Plik**: `src/app/login/page.tsx` (Server Component)
- **Ochrona**: Widok powinien być dostępny tylko dla niezalogowanych użytkowniczek. Jeśli użytkowniczka jest już zalogowana, powinna zostać przekierowana do strony głównej (`/`).
- **Middleware**: Middleware w `src/middleware.ts` odświeża sesję, ale nie blokuje dostępu do `/login` (widok jest publiczny).

## 3. Struktura komponentów

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

## 4. Szczegóły komponentów

### LoginPage (Server Component)

**Opis komponentu**: Główny komponent strony logowania odpowiedzialny za sprawdzenie stanu sesji użytkowniczki i przekierowanie zalogowanych użytkowniczek do strony głównej. Renderuje layout strony z formularzem logowania.

**Główne elementy**:
- Sprawdzenie sesji użytkowniczki przez `createClient()` z `@/db/supabase.server`
- Warunkowe przekierowanie: jeśli użytkowniczka jest zalogowana (`user !== null`), przekierowanie do `/` przez `redirect()` z Next.js
- Layout strony z kontenerem, tytułem i formularzem logowania
- `LoginForm` jako Client Component

**Obsługiwane zdarzenia**:
- Brak bezpośrednich zdarzeń (Server Component)

**Obsługiwana walidacja**:
- Brak walidacji (weryfikacja sesji tylko)

**Typy**:
- Brak props (komponent nie przyjmuje parametrów)

**Props**:
- Brak props

### LoginForm (Client Component)

**Opis komponentu**: Główny komponent formularza logowania odpowiedzialny za zarządzanie stanem formularza, walidację po stronie klienta (Zod), obsługę submit, integrację z Supabase Auth oraz obsługę błędów i przekierowań.

**Główne elementy**:
- `<form>` element z `onSubmit` handler
- `LoginFormFields` - pola formularza (email, password)
- `RememberMeCheckbox` - checkbox "Zapamiętaj mnie"
- `ValidationErrors` - wyświetlanie błędów walidacji
- `LoginButton` - przycisk "Zaloguj się" z loading state
- `LoginLinks` - linki do resetu hasła i rejestracji

**Obsługiwane zdarzenia**:
- `onSubmit` - walidacja i wysłanie żądania do Supabase Auth
- `onChange` - aktualizacja stanu formularza i walidacja w czasie rzeczywistym
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:
- Walidacja po stronie klienta (Zod) przed wysłaniem:
  - `email`: wymagane, string, format email (zod.email())
  - `password`: wymagane, string, min 6 znaków (zgodnie z konfiguracją Supabase)
- Walidacja po stronie serwera (Supabase Auth):
  - Nieprawidłowe dane logowania → błąd autoryzacji
  - Nieaktywne konto → komunikat o konieczności aktywacji

**Typy**:
- Stan: `LoginFormState` (ViewModel) - `{ email: string; password: string; rememberMe: boolean }`
- Błędy: `LoginFormErrors` - `{ email?: string; password?: string; _form?: string[] }`
- Używa: `supabase.auth.signInWithPassword()` z Supabase

**Props**:
- Brak props (komponent nie przyjmuje parametrów)

### LoginFormFields (Client Component)

**Opis komponentu**: Komponent renderujący pola formularza logowania (email i password) z walidacją inline. Każde pole wyświetla błędy walidacji bezpośrednio pod sobą.

**Główne elementy**:
- `EmailInput` - pole email z walidacją formatu
- `PasswordInput` - pole password z możliwością pokazania/ukrycia hasła (toggle visibility)

**Obsługiwane zdarzenia**:
- `onChange` - przekazanie zmiany wartości do rodzica
- `onBlur` - przekazanie zdarzenia blur do rodzica dla walidacji

**Obsługiwana walidacja**:
- Walidacja inline przez rodzica (LoginForm)
- Błędy wyświetlane pod każdym polem

**Typy**:
- Props: `LoginFormFieldsProps` - `{ fields: LoginFormState; errors: LoginFormErrors; onChange: (field: keyof LoginFormState, value: string | boolean) => void; onBlur: (field: keyof LoginFormState) => void; disabled: boolean }`

**Props**:
- `fields: LoginFormState` - aktualne wartości pól formularza
- `errors: LoginFormErrors` - błędy walidacji dla każdego pola
- `onChange: (field: keyof LoginFormState, value: string | boolean) => void` - handler zmiany wartości
- `onBlur: (field: keyof LoginFormState) => void` - handler blur dla walidacji
- `disabled: boolean` - czy formularz jest zablokowany (podczas ładowania)

### EmailInput (Client Component)

**Opis komponentu**: Komponent pola email z walidacją formatu i wyświetlaniem błędów.

**Główne elementy**:
- `<Input>` z shadcn/ui z typem `email`
- Label "Email" z ARIA
- Komunikat błędu pod polem (jeśli istnieje)
- `aria-invalid` i `aria-describedby` dla dostępności

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja wartości email
- `onBlur` - walidacja po opuszczeniu pola

**Obsługiwana walidacja**:
- Format email (walidacja przez Zod w rodzicu)
- Pole wymagane

**Typy**:
- Props: `EmailInputProps` - `{ value: string; error?: string; onChange: (value: string) => void; onBlur: () => void; disabled: boolean }`

**Props**:
- `value: string` - aktualna wartość email
- `error?: string` - komunikat błędu (opcjonalny)
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler blur
- `disabled: boolean` - czy pole jest zablokowane

### PasswordInput (Client Component)

**Opis komponentu**: Komponent pola hasła z możliwością pokazania/ukrycia hasła (toggle visibility) i wyświetlaniem błędów.

**Główne elementy**:
- `<Input>` z shadcn/ui z typem `password` lub `text` (w zależności od stanu visibility)
- Label "Hasło" z ARIA
- Przycisk toggle visibility (ikona oka) - pokazuje/ukrywa hasło
- Komunikat błędu pod polem (jeśli istnieje)
- `aria-invalid` i `aria-describedby` dla dostępności

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja wartości hasła
- `onBlur` - walidacja po opuszczeniu pola
- `onToggleVisibility` - przełączenie widoczności hasła

**Obsługiwana walidacja**:
- Minimum 6 znaków (walidacja przez Zod w rodzicu)
- Pole wymagane

**Typy**:
- Props: `PasswordInputProps` - `{ value: string; error?: string; onChange: (value: string) => void; onBlur: () => void; disabled: boolean }`
- Stan wewnętrzny: `showPassword: boolean` - czy hasło jest widoczne

**Props**:
- `value: string` - aktualna wartość hasła
- `error?: string` - komunikat błędu (opcjonalny)
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler blur
- `disabled: boolean` - czy pole jest zablokowane

### RememberMeCheckbox (Client Component)

**Opis komponentu**: Komponent checkboxa "Zapamiętaj mnie" do opcjonalnego zapamiętania sesji użytkowniczki.

**Główne elementy**:
- `<Checkbox>` z shadcn/ui
- Label "Zapamiętaj mnie" z ARIA

**Obsługiwane zdarzenia**:
- `onChange` - aktualizacja stanu checkboxa

**Obsługiwana walidacja**:
- Brak walidacji (pole opcjonalne)

**Typy**:
- Props: `RememberMeCheckboxProps` - `{ checked: boolean; onChange: (checked: boolean) => void; disabled: boolean }`

**Props**:
- `checked: boolean` - czy checkbox jest zaznaczony
- `onChange: (checked: boolean) => void` - handler zmiany stanu
- `disabled: boolean` - czy checkbox jest zablokowany

### ValidationErrors (Client Component)

**Opis komponentu**: Komponent wyświetlający ogólne błędy walidacji formularza (błędy na poziomie formularza, nie pól).

**Główne elementy**:
- Lista błędów z `errors._form` (jeśli istnieją)
- Stylowanie zgodne z shadcn/ui (destructive variant)

**Obsługiwane zdarzenia**:
- Brak bezpośrednich zdarzeń

**Obsługiwana walidacja**:
- Brak walidacji (tylko wyświetlanie)

**Typy**:
- Props: `ValidationErrorsProps` - `{ errors: string[] }`

**Props**:
- `errors: string[]` - tablica komunikatów błędów

### LoginButton (Client Component)

**Opis komponentu**: Przycisk "Zaloguj się" z obsługą stanu ładowania i wyłączeniem podczas przetwarzania.

**Główne elementy**:
- `<Button>` z shadcn/ui z typem `submit`
- Wskaźnik ładowania (spinner) podczas przetwarzania
- Tekst "Zaloguj się" lub "Logowanie..." podczas ładowania

**Obsługiwane zdarzenia**:
- `onClick` - wywołanie submit formularza (przez typ `submit`)

**Obsługiwana walidacja**:
- Przycisk wyłączony (`disabled`) gdy `isLoading === true` lub gdy formularz ma błędy walidacji

**Typy**:
- Props: `LoginButtonProps` - `{ isLoading: boolean; disabled?: boolean }`

**Props**:
- `isLoading: boolean` - czy trwa proces logowania
- `disabled?: boolean` - czy przycisk jest wyłączony (opcjonalny, domyślnie `isLoading`)

### LoginLinks (Client Component)

**Opis komponentu**: Komponent zawierający linki pomocnicze: "Nie pamiętasz hasła?" i "Zarejestruj się".

**Główne elementy**:
- Link do resetu hasła (`/reset-password`) - "Nie pamiętasz hasła?"
- Link do rejestracji (`/register`) - "Zarejestruj się"

**Obsługiwane zdarzenia**:
- `onClick` na linkach - nawigacja do odpowiednich widoków

**Obsługiwana walidacja**:
- Brak walidacji

**Typy**:
- Props: Brak props (komponent nie przyjmuje parametrów)

**Props**:
- Brak props

## 5. Typy

### LoginFormState (ViewModel)

ViewModel reprezentujący stan formularza logowania w komponencie klienckim.

```typescript
type LoginFormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};
```

**Pola**:
- `email: string` - adres email użytkowniczki (początkowo pusty string)
- `password: string` - hasło użytkowniczki (początkowo pusty string)
- `rememberMe: boolean` - czy użytkowniczka chce zapamiętać sesję (początkowo `false`)

### LoginFormErrors

Typ reprezentujący błędy walidacji formularza logowania.

```typescript
type LoginFormErrors = {
  email?: string;
  password?: string;
  _form?: string[];
};
```

**Pola**:
- `email?: string` - komunikat błędu dla pola email (opcjonalny)
- `password?: string` - komunikat błędu dla pola hasła (opcjonalny)
- `_form?: string[]` - ogólne błędy formularza (np. błędy autoryzacji z serwera, opcjonalny)

### LoginFormSchema (Zod)

Schema Zod do walidacji formularza logowania.

```typescript
import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  rememberMe: z.boolean().optional().default(false),
});

type LoginFormInput = z.infer<typeof loginFormSchema>;
```

**Walidacja**:
- `email`: wymagane, niepusty string po trim, format email
- `password`: wymagane, minimum 6 znaków (zgodnie z konfiguracją Supabase)
- `rememberMe`: opcjonalne, boolean, domyślnie `false`

### Supabase Auth Response Types

Typy odpowiedzi z Supabase Auth (używane przez `supabase.auth.signInWithPassword()`).

```typescript
// Typy z @supabase/supabase-js
type AuthResponse = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
};

type AuthError = {
  message: string;
  status?: number;
};
```

**Uwaga**: Typy są importowane z biblioteki Supabase, nie wymagają definicji w `src/types.ts`.

## 6. Zarządzanie stanem

Widok logowania używa lokalnego stanu React (useState) w komponencie `LoginForm` do zarządzania:
- Stanem formularza (`LoginFormState`)
- Błędami walidacji (`LoginFormErrors`)
- Stanem ładowania (`isLoading: boolean`)

**Custom Hook: `useLoginForm`**

Hook zarządzający logiką formularza logowania, walidacją i integracją z Supabase Auth.

**Cel**: Enkapsulacja logiki formularza, walidacji i wywołań API w jednym miejscu, ułatwiając testowanie i ponowne użycie.

**Sposób użycia**:
```typescript
const {
  fields,
  errors,
  isLoading,
  handleChange,
  handleBlur,
  handleSubmit,
} = useLoginForm({
  onSuccess: () => {
    router.push("/");
  },
});
```

**Zwracane wartości**:
- `fields: LoginFormState` - aktualne wartości pól formularza
- `errors: LoginFormErrors` - błędy walidacji
- `isLoading: boolean` - czy trwa proces logowania
- `handleChange: (field: keyof LoginFormState, value: string | boolean) => void` - handler zmiany wartości pola
- `handleBlur: (field: keyof LoginFormState) => void` - handler blur dla walidacji
- `handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>` - handler submit formularza

**Logika wewnętrzna**:
1. Inicjalizacja stanu formularza (puste wartości)
2. Walidacja pojedynczych pól przy `handleBlur`
3. Walidacja całego formularza przy `handleSubmit` (Zod)
4. Wywołanie `supabase.auth.signInWithPassword()` po udanej walidacji
5. Obsługa błędów (walidacja, autoryzacja, sieć)
6. Przekierowanie po udanym logowaniu

**Zależności**:
- `supabase` z `@/db/supabase.client`
- `zod` do walidacji
- `sonner` (lub `toast` z shadcn/ui) do powiadomień
- `useRouter` z Next.js do przekierowań

## 7. Integracja API

Widok logowania nie używa dedykowanego endpointu API, ale bezpośrednio integruje się z Supabase Auth przez klienta przeglądarkowego.

### Wywołanie API: Supabase Auth Sign In

**Metoda**: `supabase.auth.signInWithPassword()`

**Typ żądania**:
```typescript
type SignInWithPasswordRequest = {
  email: string;
  password: string;
  options?: {
    shouldCreateUser?: boolean;
  };
};
```

**Typ odpowiedzi**:
```typescript
type SignInWithPasswordResponse = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
};
```

**Implementacja**:
```typescript
import { supabase } from "@/db/supabase.client";

const { data, error } = await supabase.auth.signInWithPassword({
  email: fields.email.trim(),
  password: fields.password,
});
```

**Obsługa odpowiedzi**:
- **Sukces** (`error === null` i `data.session !== null`):
  - Przekierowanie do `/` przez `router.push("/")`
  - Opcjonalnie: toast notification "Zalogowano pomyślnie"
- **Błąd autoryzacji** (`error !== null`):
  - Ustawienie błędu w `errors._form` lub `errors.password`
  - Toast notification z komunikatem błędu
  - Formularz pozostaje wypełniony (hasło może być wyczyszczone ze względów bezpieczeństwa)

**Uwaga**: Supabase Auth automatycznie zarządza sesją przez cookies (dzięki `@supabase/ssr`), więc po udanym logowaniu sesja jest dostępna w middleware i Server Components.

## 8. Interakcje użytkownika

### 8.1 Wypełnianie formularza

**Akcja**: Użytkowniczka wprowadza email i hasło w odpowiednie pola.

**Oczekiwany wynik**:
- Wartości są aktualizowane w czasie rzeczywistym (`onChange`)
- Błędy walidacji są czyszczone przy zmianie wartości pola
- Pole ma wizualną informację zwrotną (focus state, border)

### 8.2 Walidacja po opuszczeniu pola (blur)

**Akcja**: Użytkowniczka opuszcza pole (blur).

**Oczekiwany wynik**:
- Walidacja pola jest uruchamiana (`onBlur`)
- Jeśli pole ma błąd, komunikat błędu jest wyświetlany pod polem
- Pole ma wizualną informację o błędzie (`aria-invalid`, czerwony border)

### 8.3 Przełączenie widoczności hasła

**Akcja**: Użytkowniczka klika przycisk toggle visibility w polu hasła.

**Oczekiwany wynik**:
- Typ pola zmienia się z `password` na `text` (lub odwrotnie)
- Ikona przycisku zmienia się (otwarte/zamknięte oko)
- Hasło jest widoczne/ukryte

### 8.4 Zaznaczenie/odznaczenie "Zapamiętaj mnie"

**Akcja**: Użytkowniczka klika checkbox "Zapamiętaj mnie".

**Oczekiwany wynik**:
- Checkbox zmienia stan (zaznaczony/odznaczony)
- Wartość `rememberMe` w stanie formularza jest aktualizowana

**Uwaga**: W MVP funkcjonalność "Zapamiętaj mnie" może nie mieć bezpośredniego wpływu na długość sesji (zależy od konfiguracji Supabase), ale checkbox jest dostępny zgodnie z wymaganiami UI.

### 8.5 Wysłanie formularza (submit)

**Akcja**: Użytkowniczka klika przycisk "Zaloguj się" lub naciska Enter w formularzu.

**Oczekiwany wynik**:
1. Walidacja całego formularza (Zod)
2. Jeśli walidacja nie przechodzi:
   - Błędy są wyświetlane przy odpowiednich polach
   - Formularz nie jest wysyłany
3. Jeśli walidacja przechodzi:
   - Przycisk "Zaloguj się" jest wyłączony i pokazuje stan ładowania
   - Wywołanie `supabase.auth.signInWithPassword()`
   - Po udanym logowaniu: przekierowanie do `/`
   - Po błędzie: wyświetlenie komunikatu błędu (toast + inline)

### 8.6 Kliknięcie "Nie pamiętasz hasła?"

**Akcja**: Użytkowniczka klika link "Nie pamiętasz hasła?".

**Oczekiwany wynik**:
- Przekierowanie do `/reset-password` przez `router.push("/reset-password")`

### 8.7 Kliknięcie "Zarejestruj się"

**Akcja**: Użytkowniczka klika link "Zarejestruj się".

**Oczekiwany wynik**:
- Przekierowanie do `/register` przez `router.push("/register")`

### 8.8 Automatyczne ustawienie focus

**Akcja**: Strona logowania się ładuje.

**Oczekiwany wynik**:
- Pole email automatycznie otrzymuje focus (przez `autoFocus` lub `useEffect` z `ref.current?.focus()`)
- Użytkowniczka może od razu zacząć wpisywać email

## 9. Warunki i walidacja

### 9.1 Walidacja po stronie klienta (Zod)

**Komponenty**: `LoginForm`, `useLoginForm`

**Warunki**:
1. **Email**:
   - Pole wymagane (nie może być puste)
   - Format email (walidacja przez `zod.email()`)
   - Trim białych znaków na początku i końcu
2. **Hasło**:
   - Pole wymagane (nie może być puste)
   - Minimum 6 znaków (zgodnie z konfiguracją Supabase)

**Wpływ na stan interfejsu**:
- Błędy walidacji są wyświetlane pod odpowiednimi polami (`errors.email`, `errors.password`)
- Przycisk "Zaloguj się" może być wyłączony, jeśli formularz ma błędy (opcjonalnie)
- Pola z błędami mają wizualną informację zwrotną (czerwony border, `aria-invalid`)

### 9.2 Walidacja po stronie serwera (Supabase Auth)

**Komponenty**: `LoginForm`, `useLoginForm`

**Warunki**:
1. **Nieprawidłowe dane logowania**:
   - Email lub hasło są nieprawidłowe
   - Konto nie istnieje
   - Błąd: `AuthError` z Supabase
2. **Nieaktywne konto**:
   - Konto istnieje, ale nie zostało aktywowane (jeśli wymagana aktywacja email)
   - Błąd: `AuthError` z komunikatem o konieczności aktywacji

**Wpływ na stan interfejsu**:
- Błąd autoryzacji jest wyświetlany jako ogólny błąd formularza (`errors._form`) lub błąd hasła (`errors.password`)
- Toast notification z komunikatem błędu
- Formularz pozostaje wypełniony (email pozostaje, hasło może być wyczyszczone)
- Przycisk "Zaloguj się" jest ponownie włączony

### 9.3 Sprawdzenie sesji użytkowniczki (Server Component)

**Komponenty**: `LoginPage`

**Warunki**:
- Jeśli użytkowniczka jest już zalogowana (`user !== null`), przekierowanie do `/`

**Wpływ na stan interfejsu**:
- Zalogowane użytkowniczki nie widzą formularza logowania (przekierowanie)

## 10. Obsługa błędów

### 10.1 Błąd walidacji pola (Zod)

**Scenariusz**: Pole email lub hasło nie przechodzi walidacji Zod (np. nieprawidłowy format email, za krótkie hasło).

**Obsługa**:
- Komunikat błędu wyświetlany pod polem (`errors.email` lub `errors.password`)
- Pole ma wizualną informację o błędzie (czerwony border, `aria-invalid`)
- Formularz nie jest wysyłany do serwera

**Implementacja**:
```typescript
const error = validateField(field, value);
if (error) {
  setErrors((prev) => ({ ...prev, [field]: error }));
}
```

### 10.2 Błąd autoryzacji (nieprawidłowe dane logowania)

**Scenariusz**: Email lub hasło są nieprawidłowe, lub konto nie istnieje.

**Obsługa**:
- Toast notification: "Nieprawidłowy email lub hasło"
- Błąd wyświetlany jako ogólny błąd formularza (`errors._form`) lub błąd hasła (`errors.password`)
- Formularz pozostaje wypełniony (email pozostaje, hasło może być wyczyszczone ze względów bezpieczeństwa)
- Użytkowniczka może spróbować ponownie

**Implementacja**:
```typescript
if (error) {
  toast.error("Nieprawidłowy email lub hasło");
  setErrors((prev) => ({
    ...prev,
    _form: ["Nieprawidłowy email lub hasło"],
    password: "Nieprawidłowe hasło",
  }));
  // Opcjonalnie: wyczyszczenie hasła
  setFields((prev) => ({ ...prev, password: "" }));
}
```

### 10.3 Błąd nieaktywnego konta

**Scenariusz**: Konto istnieje, ale nie zostało aktywowane (jeśli wymagana aktywacja email).

**Obsługa**:
- Toast notification: "Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny."
- Błąd wyświetlany jako ogólny błąd formularza (`errors._form`)
- Formularz pozostaje wypełniony
- Sugestia sprawdzenia emaila

**Implementacja**:
```typescript
if (error?.message.includes("email not confirmed") || error?.message.includes("Email not confirmed")) {
  toast.error("Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny.");
  setErrors((prev) => ({
    ...prev,
    _form: ["Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny."],
  }));
}
```

### 10.4 Błąd sieci (network error)

**Scenariusz**: Brak połączenia z internetem lub timeout podczas wywołania Supabase Auth.

**Obsługa**:
- Toast notification: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Błąd wyświetlany jako ogólny błąd formularza (`errors._form`)
- Formularz pozostaje wypełniony, użytkowniczka może spróbować ponownie

**Implementacja**:
```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({...});
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
    setErrors((prev) => ({
      ...prev,
      _form: ["Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."],
    }));
  }
}
```

### 10.5 Błąd serwera (500)

**Scenariusz**: Nieoczekiwany błąd serwera Supabase podczas logowania.

**Obsługa**:
- Toast notification: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Błąd wyświetlany jako ogólny błąd formularza (`errors._form`)
- Formularz pozostaje wypełniony, użytkowniczka może spróbować ponownie

**Implementacja**:
```typescript
if (error && error.status && error.status >= 500) {
  toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
  setErrors((prev) => ({
    ...prev,
    _form: ["Wystąpił błąd serwera. Spróbuj ponownie później."],
  }));
}
```

### 10.6 Toast notifications

**Komponenty**: Wszystkie Client Components używające `toast` z `sonner`

**Użycie**:
- Błędy autoryzacji → toast z komunikatem błędu
- Błędy sieci → toast z komunikatem o braku połączenia
- Błędy serwera → toast z komunikatem o błędzie serwera
- Sukces logowania → opcjonalnie toast z komunikatem "Zalogowano pomyślnie" (może być pominięty, ponieważ następuje przekierowanie)

**Implementacja**:
```typescript
import { toast } from "sonner";

toast.error("Nieprawidłowy email lub hasło");
// lub
toast.success("Zalogowano pomyślnie");
```

**Uwaga**: Komponent `Toaster` jest już dodany do `src/app/layout.tsx`, więc toast notifications będą działać automatycznie.

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie `src/app/login/page.tsx` (Server Component - główna strona logowania)
2. Utworzenie katalogu `src/components/auth/login/` dla komponentów formularza logowania

### Krok 2: Implementacja hooka `useLoginForm`

1. Utworzenie `src/hooks/use-login-form.ts` (custom hook do zarządzania formularzem logowania)
2. Implementacja schematu Zod (`loginFormSchema`) w `src/lib/validation/auth.ts` lub bezpośrednio w hooku
3. Implementacja logiki walidacji, stanu formularza i integracji z Supabase Auth

### Krok 3: Implementacja komponentów formularza

1. Utworzenie `src/components/auth/login/login-form.tsx` (Client Component - główny formularz)
2. Utworzenie `src/components/auth/login/login-form-fields.tsx` (Client Component - pola formularza)
3. Utworzenie `src/components/auth/login/email-input.tsx` (Client Component - pole email)
4. Utworzenie `src/components/auth/login/password-input.tsx` (Client Component - pole hasła z toggle visibility)
5. Utworzenie `src/components/auth/login/remember-me-checkbox.tsx` (Client Component - checkbox "Zapamiętaj mnie")
6. Utworzenie `src/components/auth/login/login-button.tsx` (Client Component - przycisk "Zaloguj się")
7. Utworzenie `src/components/auth/login/login-links.tsx` (Client Component - linki pomocnicze)
8. Utworzenie `src/components/auth/login/validation-errors.tsx` (Client Component - błędy walidacji) lub użycie istniejącego komponentu

### Krok 4: Implementacja strony logowania (Server Component)

1. Implementacja `src/app/login/page.tsx`:
   - Sprawdzenie sesji użytkowniczki przez `createClient()`
   - Przekierowanie zalogowanych użytkowniczek do `/`
   - Renderowanie layoutu strony z formularzem logowania
   - Import i użycie `LoginForm`

### Krok 5: Implementacja dostępności i UX

1. Dodanie ARIA labels do wszystkich pól formularza
2. Implementacja automatycznego focus na pole email przy załadowaniu strony
3. Dodanie `aria-invalid` i `aria-describedby` dla pól z błędami
4. Implementacja keyboard navigation (Enter do submit, Tab do nawigacji)

### Krok 6: Implementacja obsługi błędów

1. Implementacja obsługi błędów walidacji (Zod) w `useLoginForm`
2. Implementacja obsługi błędów autoryzacji (Supabase Auth) w `useLoginForm`
3. Implementacja obsługi błędów sieci w `useLoginForm`
4. Dodanie toast notifications dla wszystkich typów błędów

### Krok 7: Testowanie

1. Testowanie logowania z prawidłowymi danymi
2. Testowanie walidacji pól (nieprawidłowy email, za krótkie hasło)
3. Testowanie błędów autoryzacji (nieprawidłowe dane logowania)
4. Testowanie przekierowania zalogowanych użytkowniczek
5. Testowanie dostępności (screen reader, keyboard navigation)
6. Testowanie responsywności (mobile, tablet, desktop)

### Krok 8: Integracja z middleware (opcjonalnie)

1. Sprawdzenie, czy middleware prawidłowo obsługuje sesję po logowaniu
2. Weryfikacja, że chronione route'y są dostępne po zalogowaniu
3. Weryfikacja, że `/login` jest dostępny dla niezalogowanych użytkowniczek

### Krok 9: Dokumentacja i cleanup

1. Dodanie komentarzy JSDoc do komponentów i hooków
2. Sprawdzenie zgodności z regułami ESLint
3. Sprawdzenie zgodności z TypeScript strict mode
4. Aktualizacja dokumentacji projektu (jeśli wymagane)
