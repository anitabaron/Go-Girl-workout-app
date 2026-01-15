# Plan implementacji widoku resetu hasła

## 1. Przegląd

Widok resetu hasła umożliwia użytkowniczce zresetowanie zapomnianego hasła poprzez wprowadzenie adresu email. Po wprowadzeniu poprawnego adresu email, Supabase Auth wysyła link resetujący hasło na podany adres. Widok jest prostym formularzem z jednym polem email, instrukcją dla użytkowniczki oraz linkiem powrotnym do logowania.

Widok jest dostępny pod ścieżką `/reset-password` i nie wymaga autoryzacji (dostępny dla niezalogowanych użytkowników). Po wysłaniu żądania resetu hasła, użytkowniczka otrzymuje toast notification z informacją o konieczności sprawdzenia skrzynki email, niezależnie od tego, czy podany email istnieje w systemie (zabezpieczenie przed wyciekiem informacji).

## 2. Routing widoku

Widok jest dostępny pod ścieżką:

- **Reset hasła**: `/reset-password` - Server Component page z formularzem resetu hasła

Struktura plików:

```
src/app/reset-password/
  └── page.tsx          # Server Component - strona resetu hasła
```

**Uwaga dotycząca middleware**: Widok `/reset-password` powinien być dostępny dla niezalogowanych użytkowników. Middleware nie powinien przekierowywać użytkowniczki do `/login`, jeśli próbuje uzyskać dostęp do `/reset-password`.

## 3. Struktura komponentów

```
ResetPasswordPage (Server Component)
  └── ResetPasswordForm (Client Component)
      ├── ResetPasswordFormFields (Client Component)
      │   ├── Label (email)
      │   └── Input (email)
      ├── ResetPasswordInstructions (Client Component)
      ├── ResetPasswordButton (Client Component)
      └── BackToLoginLink (Client Component)
```

## 4. Szczegóły komponentów

### ResetPasswordPage (Server Component)

**Opis komponentu**: Główny komponent strony odpowiedzialny za renderowanie widoku resetu hasła. Komponent jest Server Component, który renderuje layout strony oraz formularz resetu hasła.

**Główne elementy**:

- Header z tytułem strony ("Reset hasła")
- Komponent `ResetPasswordForm` z formularzem resetu hasła
- Layout zgodny z innymi widokami autoryzacji (spójny design)

**Obsługiwane zdarzenia**: Brak (Server Component)

**Obsługiwana walidacja**: Brak (walidacja w Client Component)

**Typy**:

- Props: Brak (komponent strony Next.js)
- Używa: Brak (tylko renderowanie)

**Props**: Brak (komponent strony Next.js)

### ResetPasswordForm (Client Component)

**Opis komponentu**: Główny komponent formularza odpowiedzialny za zarządzanie stanem formularza, walidację po stronie klienta (Zod), obsługę submit oraz integrację z Supabase Auth do wysłania linku resetującego hasło.

**Główne elementy**:

- `<form>` element z `onSubmit` handler
- `ResetPasswordFormFields` - pole email z label
- `ResetPasswordInstructions` - instrukcja dla użytkowniczki
- `ResetPasswordButton` - przycisk wysłania linku resetującego z loading state
- `BackToLoginLink` - link powrotny do logowania

**Obsługiwane zdarzenia**:

- `onSubmit` - walidacja i wysłanie żądania resetu hasła do Supabase Auth
- `onChange` - aktualizacja stanu formularza i walidacja w czasie rzeczywistym
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:

- Walidacja po stronie klienta (Zod) przed wysłaniem:
  - `email`: wymagane, string, trim, format email (z.string().email())
- Walidacja po stronie Supabase:
  - Format email (zgodny z RFC 5322)
  - Rate limiting (zgodnie z konfiguracją Supabase: max_frequency = "1s", email_sent = 2 na godzinę)
  - Sprawdzenie, czy email istnieje w systemie (ale odpowiedź jest zawsze pozytywna dla bezpieczeństwa)

**Typy**:

- Props: Brak (komponent nie przyjmuje props)
- Stan: `ResetPasswordFormState` (ViewModel)
- Używa: `supabase.auth.resetPasswordForEmail()` z Supabase Auth

**Props**: Brak (komponent nie przyjmuje props)

### ResetPasswordFormFields (Client Component)

**Opis komponentu**: Komponent renderujący pole email z label i walidacją inline. Pole wyświetla błędy walidacji bezpośrednio pod sobą.

**Główne elementy**:

- Label dla pola email (z ARIA label)
- Input email (type="email") z walidacją formatu
- Komunikat błędu walidacji (wyświetlany pod polem, jeśli występuje błąd)

**Obsługiwane zdarzenia**:

- `onChange` - przekazywane do rodzica (ResetPasswordForm)
- `onBlur` - walidacja pola po opuszczeniu

**Obsługiwana walidacja**:

- Walidacja inline dla pola email zgodnie z regułami Zod:
  - Pole wymagane
  - Format email (z.string().email("Nieprawidłowy format adresu email"))
- Wyświetlanie błędów pod polem

**Typy**:

- Props: `{ email: string; error?: string; onChange: (value: string) => void; onBlur: () => void; disabled: boolean }`
- Używa: Komponenty UI z shadcn/ui (Input, Label)

**Props**:

- `email: string` - wartość pola email
- `error?: string` - komunikat błędu walidacji (opcjonalny)
- `onChange: (value: string) => void` - handler zmiany wartości
- `onBlur: () => void` - handler opuszczenia pola
- `disabled: boolean` - czy pole jest wyłączone (podczas wysyłania)

### ResetPasswordInstructions (Client Component)

**Opis komponentu**: Komponent wyświetlający instrukcję dla użytkowniczki dotyczącą procesu resetu hasła.

**Główne elementy**:

- Tekst instrukcji: "Wprowadź adres email, a wyślemy Ci link do resetu hasła"

**Obsługiwane zdarzenia**: Brak

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: Brak
- Używa: Brak

**Props**: Brak

### ResetPasswordButton (Client Component)

**Opis komponentu**: Przycisk wysłania linku resetującego hasło z obsługą stanu ładowania i wyłączenia podczas wysyłania żądania.

**Główne elementy**:

- Button z tekstem "Wyślij link resetujący"
- Wskaźnik ładowania (spinner) podczas wysyłania żądania
- Wyłączenie przycisku podczas wysyłania żądania

**Obsługiwane zdarzenia**:

- `onClick` - wywołanie submit formularza (przez type="submit" w formularzu)

**Obsługiwana walidacja**: Brak (walidacja w formularzu)

**Typy**:

- Props: `{ isLoading: boolean; disabled: boolean }`
- Używa: Komponent Button z shadcn/ui

**Props**:

- `isLoading: boolean` - czy żądanie jest w trakcie wysyłania
- `disabled: boolean` - czy przycisk jest wyłączony

### BackToLoginLink (Client Component)

**Opis komponentu**: Link powrotny do widoku logowania.

**Główne elementy**:

- Link z tekstem "Wróć do logowania"
- Nawigacja do `/login` przy kliknięciu

**Obsługiwane zdarzenia**:

- `onClick` - nawigacja do `/login` (przez Next.js Link)

**Obsługiwana walidacja**: Brak

**Typy**:

- Props: Brak
- Używa: Komponent Link z Next.js

**Props**: Brak

## 5. Typy

### ResetPasswordFormState (ViewModel)

ViewModel reprezentujący stan formularza resetu hasła:

```typescript
type ResetPasswordFormState = {
  email: string;
};
```

**Pola**:

- `email: string` - adres email użytkowniczki (początkowo pusty string)

### ResetPasswordFormErrors

Typ reprezentujący błędy walidacji formularza:

```typescript
type ResetPasswordFormErrors = {
  email?: string;
  _form?: string[];
};
```

**Pola**:

- `email?: string` - komunikat błędu walidacji dla pola email (opcjonalny)
- `_form?: string[]` - ogólne błędy formularza (opcjonalne, tablica komunikatów)

### Zod Schema dla walidacji

Schema Zod dla walidacji formularza resetu hasła:

```typescript
import { z } from "zod";

const resetPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Adres email jest wymagany")
    .email("Nieprawidłowy format adresu email"),
});
```

**Reguły walidacji**:

- `email`: wymagane, string, trim, min 1 znak, format email (zgodny z RFC 5322)

## 6. Zarządzanie stanem

Widok resetu hasła używa prostego zarządzania stanem przez React hooks w komponencie `ResetPasswordForm`:

### Stan formularza

- `email: string` - wartość pola email (początkowo pusty string)
- `errors: ResetPasswordFormErrors` - błędy walidacji (początkowo pusty obiekt)
- `isLoading: boolean` - czy żądanie jest w trakcie wysyłania (początkowo false)
- `isSubmitted: boolean` - czy formularz został już wysłany (początkowo false, używane do wyświetlenia komunikatu sukcesu)

### Custom Hook: `useResetPasswordForm`

Hook zarządzający stanem i logiką formularza resetu hasła:

```typescript
function useResetPasswordForm() {
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Walidacja pojedynczego pola
  const validateField = (field: "email", value: string): string | undefined;

  // Walidacja całego formularza
  const validateForm = (): boolean;

  // Handler zmiany wartości pola
  const handleChange = (value: string): void;

  // Handler opuszczenia pola
  const handleBlur = (): void;

  // Handler submit formularza
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void>;

  return {
    email,
    errors,
    isLoading,
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
```

**Cel i sposób użycia**:

- Centralizuje logikę formularza resetu hasła
- Zarządza stanem formularza (email, błędy, loading)
- Obsługuje walidację po stronie klienta (Zod)
- Integruje się z Supabase Auth do wysłania linku resetującego hasło
- Obsługuje wyświetlanie komunikatów sukcesu i błędów przez toast notifications

## 7. Integracja API

Widok resetu hasła nie używa dedykowanego endpointu API, ale bezpośrednio integruje się z Supabase Auth przez klienta przeglądarki.

### Supabase Auth: `resetPasswordForEmail`

**Metoda**: `supabase.auth.resetPasswordForEmail(email, options?)`

**Typy żądania**:

```typescript
// Parametry
email: string; // Adres email użytkowniczki
options?: {
  redirectTo?: string; // URL przekierowania po kliknięciu linku (opcjonalny)
  captchaToken?: string; // Token CAPTCHA (opcjonalny, jeśli włączone)
}
```

**Typy odpowiedzi**:

```typescript
// Sukces
{
  data: {};
  error: null;
}

// Błąd
{
  data: null;
  error: {
    message: string; // Komunikat błędu
    status?: number; // Kod statusu HTTP (opcjonalny)
  };
}
```

**Obsługiwane błędy**:

- `rate_limit_exceeded` - przekroczony limit wysyłania emaili (zgodnie z konfiguracją: email_sent = 2 na godzinę, max_frequency = "1s")
- `invalid_email` - nieprawidłowy format email (powinien być obsłużony przez walidację po stronie klienta)
- `email_not_confirmed` - email nie został potwierdzony (w MVP nie powinien wystąpić, ponieważ enable_confirmations = false)
- Inne błędy sieciowe lub serwerowe

**Uwaga dotycząca bezpieczeństwa**: Supabase Auth zawsze zwraca sukces, nawet jeśli email nie istnieje w systemie, aby zapobiec wyciekowi informacji o istnieniu konta.

### Przykład użycia

```typescript
import { supabase } from "@/db/supabase.client";

const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password/confirm`,
});
```

**Uwaga**: W MVP nie implementujemy widoku potwierdzenia resetu hasła (`/reset-password/confirm`), więc użytkowniczka będzie przekierowana do domyślnego widoku Supabase lub do widoku logowania po kliknięciu linku w emailu.

## 8. Interakcje użytkownika

### 8.1 Wprowadzenie adresu email

**Akcja użytkowniczki**: Wprowadzenie adresu email w pole formularza.

**Oczekiwany wynik**:

- Wartość pola jest aktualizowana w czasie rzeczywistym
- Błąd walidacji dla tego pola jest czyszczony (jeśli występował)
- Pole jest oznaczone jako "touched" (dla późniejszej walidacji)

**Obsługa**: Handler `handleChange` w `useResetPasswordForm` aktualizuje stan `email` i czyści błąd dla tego pola.

### 8.2 Opuszczenie pola email

**Akcja użytkowniczki**: Opuszczenie pola email (blur event).

**Oczekiwany wynik**:

- Walidacja pola email jest wykonywana
- Jeśli walidacja nie przechodzi, błąd jest wyświetlany pod polem
- Jeśli walidacja przechodzi, błąd jest czyszczony

**Obsługa**: Handler `handleBlur` w `useResetPasswordForm` wykonuje walidację pola i aktualizuje stan błędów.

### 8.3 Wysłanie formularza (poprawne dane)

**Akcja użytkowniczki**: Kliknięcie przycisku "Wyślij link resetujący" z poprawnym adresem email.

**Oczekiwany wynik**:

1. Walidacja formularza jest wykonywana
2. Jeśli walidacja przechodzi:
   - Przycisk jest wyłączony i wyświetla wskaźnik ładowania
   - Żądanie resetu hasła jest wysyłane do Supabase Auth
   - Toast notification z komunikatem: "Sprawdź swoją skrzynkę email. Jeśli podany adres istnieje w systemie, otrzymasz link do resetu hasła."
   - Formularz jest wyłączony (opcjonalnie, można pozwolić na ponowne wysłanie)
   - Stan `isSubmitted` jest ustawiony na `true`
3. Jeśli walidacja nie przechodzi:
   - Błędy walidacji są wyświetlane pod odpowiednimi polami
   - Formularz nie jest wysyłany

**Obsługa**: Handler `handleSubmit` w `useResetPasswordForm` wykonuje walidację, wysyła żądanie do Supabase Auth i wyświetla odpowiednie komunikaty.

### 8.4 Wysłanie formularza (błąd walidacji)

**Akcja użytkowniczki**: Kliknięcie przycisku "Wyślij link resetujący" z niepoprawnym adresem email (np. pusty lub nieprawidłowy format).

**Oczekiwany wynik**:

- Walidacja formularza jest wykonywana
- Błędy walidacji są wyświetlane pod polem email
- Formularz nie jest wysyłany
- Przycisk pozostaje aktywny

**Obsługa**: Handler `handleSubmit` w `useResetPasswordForm` wykonuje walidację i aktualizuje stan błędów, jeśli walidacja nie przechodzi.

### 8.5 Wysłanie formularza (błąd sieciowy lub serwerowy)

**Akcja użytkowniczki**: Kliknięcie przycisku "Wyślij link resetujący" z poprawnym adresem email, ale żądanie kończy się błędem.

**Oczekiwany wynik**:

- Toast notification z komunikatem błędu (np. "Nie udało się wysłać linku resetującego. Spróbuj ponownie później.")
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony (użytkowniczka może spróbować ponownie)

**Obsługa**: Handler `handleSubmit` w `useResetPasswordForm` obsługuje błędy z Supabase Auth i wyświetla odpowiednie komunikaty przez toast notifications.

### 8.6 Przekroczenie limitu wysyłania emaili (rate limiting)

**Akcja użytkowniczki**: Próba wysłania żądania resetu hasła, gdy limit wysyłania emaili został przekroczony (zgodnie z konfiguracją: email_sent = 2 na godzinę).

**Oczekiwany wynik**:

- Toast notification z komunikatem: "Zbyt wiele prób wysłania linku resetującego. Spróbuj ponownie za chwilę."
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony

**Obsługa**: Handler `handleSubmit` w `useResetPasswordForm` wykrywa błąd `rate_limit_exceeded` z Supabase Auth i wyświetla odpowiedni komunikat.

### 8.7 Powrót do logowania

**Akcja użytkowniczki**: Kliknięcie linku "Wróć do logowania".

**Oczekiwany wynik**:

- Nawigacja do widoku logowania (`/login`)
- Stan formularza resetu hasła nie jest zachowywany

**Obsługa**: Komponent `BackToLoginLink` używa Next.js Link do nawigacji do `/login`.

## 9. Warunki i walidacja

### 9.1 Walidacja po stronie klienta (Zod)

Walidacja jest wykonywana przed wysłaniem żądania do Supabase Auth:

**Warunki dla pola email**:

- Pole jest wymagane (nie może być puste)
- Wartość musi być stringiem
- Wartość jest trimowana (usuwane białe znaki na początku i końcu)
- Wartość musi mieć format email (zgodny z RFC 5322)
- Minimalna długość: 1 znak (po trim)
- Maksymalna długość: zgodna z limitem Supabase (domyślnie 255 znaków)

**Komponenty odpowiedzialne za walidację**:

- `useResetPasswordForm` - hook zarządzający walidacją
- `ResetPasswordFormFields` - komponent wyświetlający błędy walidacji

**Wpływ na stan interfejsu**:

- Jeśli walidacja nie przechodzi:
  - Błędy są wyświetlane pod polem email
  - Przycisk "Wyślij link resetujący" jest wyłączony (opcjonalnie, można pozwolić na wysłanie i walidację po stronie serwera)
  - Pole email jest oznaczone jako nieprawidłowe (aria-invalid="true")
- Jeśli walidacja przechodzi:
  - Błędy są czyszczone
  - Pole email jest oznaczone jako prawidłowe
  - Przycisk jest aktywny

### 9.2 Walidacja po stronie Supabase Auth

Supabase Auth wykonuje dodatkową walidację po stronie serwera:

**Warunki**:

- Format email (zgodny z RFC 5322)
- Rate limiting (zgodnie z konfiguracją: email_sent = 2 na godzinę, max_frequency = "1s")
- Sprawdzenie, czy email istnieje w systemie (ale odpowiedź jest zawsze pozytywna dla bezpieczeństwa)

**Obsługa błędów**:

- Błędy z Supabase Auth są wyświetlane przez toast notifications
- Formularz pozostaje wypełniony, aby użytkowniczka mogła spróbować ponownie

## 10. Obsługa błędów

### 10.1 Błędy walidacji po stronie klienta

**Scenariusz**: Użytkowniczka wprowadza nieprawidłowy format email (np. "niepoprawny-email").

**Obsługa**:

- Błąd walidacji jest wyświetlany pod polem email: "Nieprawidłowy format adresu email"
- Pole email jest oznaczone jako nieprawidłowe (aria-invalid="true")
- Formularz nie jest wysyłany

**Komponent odpowiedzialny**: `ResetPasswordFormFields` wyświetla błąd pod polem.

### 10.2 Błąd sieciowy

**Scenariusz**: Brak połączenia z internetem lub timeout podczas wysyłania żądania.

**Obsługa**:

- Toast notification z komunikatem: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony

**Komponent odpowiedzialny**: `useResetPasswordForm` obsługuje błędy sieciowe w handlerze `handleSubmit`.

### 10.3 Błąd serwerowy (5xx)

**Scenariusz**: Błąd serwera Supabase (np. 500 Internal Server Error).

**Obsługa**:

- Toast notification z komunikatem: "Wystąpił błąd serwera. Spróbuj ponownie później."
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony

**Komponent odpowiedzialny**: `useResetPasswordForm` obsługuje błędy serwerowe w handlerze `handleSubmit`.

### 10.4 Przekroczenie limitu wysyłania emaili (rate limiting)

**Scenariusz**: Użytkowniczka próbuje wysłać żądanie resetu hasła zbyt często (zgodnie z konfiguracją: email_sent = 2 na godzinę).

**Obsługa**:

- Toast notification z komunikatem: "Zbyt wiele prób wysłania linku resetującego. Spróbuj ponownie za chwilę."
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony

**Komponent odpowiedzialny**: `useResetPasswordForm` wykrywa błąd `rate_limit_exceeded` z Supabase Auth i wyświetla odpowiedni komunikat.

### 10.5 Nieoczekiwany błąd

**Scenariusz**: Błąd, który nie został przewidziany w kodzie (np. nieprawidłowa odpowiedź z Supabase).

**Obsługa**:

- Toast notification z komunikatem: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
- Przycisk jest ponownie włączony
- Formularz pozostaje wypełniony
- Błąd jest logowany w konsoli (w trybie deweloperskim)

**Komponent odpowiedzialny**: `useResetPasswordForm` obsługuje nieoczekiwane błędy w handlerze `handleSubmit` (catch-all).

### 10.6 Sukces (nawet jeśli email nie istnieje)

**Scenariusz**: Użytkowniczka wprowadza poprawny format email (nawet jeśli email nie istnieje w systemie).

**Obsługa**:

- Toast notification z komunikatem: "Sprawdź swoją skrzynkę email. Jeśli podany adres istnieje w systemie, otrzymasz link do resetu hasła."
- Formularz może pozostać aktywny (aby umożliwić ponowne wysłanie) lub zostać wyłączony
- Stan `isSubmitted` jest ustawiony na `true` (opcjonalnie, do wyświetlenia dodatkowego komunikatu)

**Komponent odpowiedzialny**: `useResetPasswordForm` obsługuje sukces w handlerze `handleSubmit`.

**Uwaga dotycząca bezpieczeństwa**: Supabase Auth zawsze zwraca sukces, nawet jeśli email nie istnieje w systemie, aby zapobiec wyciekowi informacji o istnieniu konta. Komunikat dla użytkowniczki powinien być neutralny i nie wskazywać, czy email istnieje w systemie.

## 11. Kroki implementacji

1. **Utworzenie struktury plików**:
   - Utworzenie katalogu `src/app/reset-password/`
   - Utworzenie pliku `src/app/reset-password/page.tsx` (Server Component)

2. **Utworzenie komponentu strony (ResetPasswordPage)**:
   - Implementacja Server Component z layoutem strony
   - Dodanie headera z tytułem "Reset hasła"
   - Renderowanie komponentu `ResetPasswordForm`

3. **Utworzenie komponentu formularza (ResetPasswordForm)**:
   - Implementacja Client Component z formularzem
   - Dodanie elementu `<form>` z handlerem `onSubmit`
   - Integracja z custom hookiem `useResetPasswordForm`

4. **Utworzenie custom hooka (useResetPasswordForm)**:
   - Implementacja hooka zarządzającego stanem formularza
   - Dodanie stanu: `email`, `errors`, `isLoading`, `isSubmitted`
   - Implementacja walidacji po stronie klienta (Zod)
   - Implementacja handlerów: `handleChange`, `handleBlur`, `handleSubmit`
   - Integracja z Supabase Auth (`supabase.auth.resetPasswordForEmail`)
   - Obsługa błędów i wyświetlanie toast notifications

5. **Utworzenie schema Zod dla walidacji**:
   - Utworzenie pliku `src/lib/validation/reset-password.ts`
   - Implementacja schema `resetPasswordFormSchema` z walidacją email

6. **Utworzenie komponentu pól formularza (ResetPasswordFormFields)**:
   - Implementacja Client Component z polem email
   - Dodanie Label z ARIA label
   - Dodanie Input (type="email") z obsługą błędów
   - Wyświetlanie komunikatów błędów pod polem

7. **Utworzenie komponentu instrukcji (ResetPasswordInstructions)**:
   - Implementacja Client Component z tekstem instrukcji
   - Dodanie tekstu: "Wprowadź adres email, a wyślemy Ci link do resetu hasła"

8. **Utworzenie komponentu przycisku (ResetPasswordButton)**:
   - Implementacja Client Component z przyciskiem
   - Dodanie wskaźnika ładowania (spinner) podczas wysyłania
   - Wyłączenie przycisku podczas wysyłania żądania

9. **Utworzenie komponentu linku powrotnego (BackToLoginLink)**:
   - Implementacja Client Component z linkiem
   - Dodanie tekstu "Wróć do logowania"
   - Nawigacja do `/login` przy kliknięciu

10. **Dodanie toast notifications**:
    - Użycie biblioteki `sonner` do wyświetlania komunikatów
    - Dodanie toast notification po udanym wysłaniu żądania
    - Dodanie toast notifications dla błędów (sieć, serwer, rate limiting)

11. **Dodanie dostępności (ARIA)**:
    - Dodanie ARIA labels dla wszystkich pól formularza
    - Dodanie `aria-invalid` dla pól z błędami walidacji
    - Dodanie `aria-describedby` dla pól z komunikatami błędów
    - Dodanie `aria-busy` dla przycisku podczas ładowania

12. **Dodanie focus management**:
    - Automatyczne ustawienie focus na pole email przy załadowaniu strony
    - Zarządzanie focus po wysłaniu formularza (opcjonalnie, powrót do pola email)

13. **Testowanie**:
    - Testowanie walidacji po stronie klienta (pusty email, nieprawidłowy format)
    - Testowanie wysyłania żądania z poprawnym emailem
    - Testowanie obsługi błędów (sieć, serwer, rate limiting)
    - Testowanie dostępności (screen reader, keyboard navigation)
    - Testowanie responsywności (mobile, tablet, desktop)

14. **Dokumentacja**:
    - Dodanie komentarzy w kodzie (jeśli potrzebne)
    - Aktualizacja dokumentacji projektu (jeśli istnieje)
