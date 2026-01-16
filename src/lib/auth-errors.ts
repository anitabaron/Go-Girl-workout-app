import type { AuthError } from "@supabase/supabase-js";

/**
 * Mapuje błędy Supabase Auth na komunikaty użytkownika.
 * 
 * Zasady bezpieczeństwa:
 * - Nie ujawnia, czy email istnieje w systemie (ogólne komunikaty)
 * - Nie ujawnia szczegółów błędów serwera (ogólne komunikaty)
 * - Zapewnia spójne komunikaty błędów w całej aplikacji
 * 
 * @param error - Błąd z Supabase Auth
 * @returns Komunikat błędu dla użytkownika
 * 
 * @example
 * const { data, error } = await supabase.auth.signInWithPassword({...});
 * if (error) {
 *   const message = mapAuthError(error);
 *   toast.error(message);
 * }
 */
export function mapAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) {
    return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";
  }

  // Obsługa błędów sieciowych
  if (error instanceof TypeError) {
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      return "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.";
    }
    return "Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.";
  }

  // Obsługa błędów Supabase Auth
  if ("message" in error && "status" in error) {
    const authError = error as AuthError;
    const errorMsg = authError.message.toLowerCase();
    const status = authError.status;

    // Email niepotwierdzony
    if (
      errorMsg.includes("email not confirmed") ||
      errorMsg.includes("email_not_confirmed") ||
      errorMsg.includes("email not verified")
    ) {
      return "Konto nie zostało aktywowane. Sprawdź email i kliknij link aktywacyjny.";
    }

    // Rate limiting
    if (
      errorMsg.includes("rate limit") ||
      errorMsg.includes("too many requests") ||
      status === 429
    ) {
      return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
    }

    // Błąd serwera (5xx)
    if (status && status >= 500) {
      return "Wystąpił błąd serwera. Spróbuj ponownie później.";
    }

    // Konto już istnieje (dla rejestracji)
    if (
      errorMsg.includes("already registered") ||
      errorMsg.includes("already exists") ||
      errorMsg.includes("user already registered")
    ) {
      return "Konto z tym adresem email już istnieje. Zaloguj się lub zresetuj hasło.";
    }

    // Nieprawidłowy format email
    if (
      errorMsg.includes("invalid email") ||
      errorMsg.includes("email format")
    ) {
      return "Nieprawidłowy format email.";
    }

    // Błąd hasła (ogólny - nie ujawnia szczegółów)
    if (
      errorMsg.includes("password") ||
      errorMsg.includes("invalid credentials") ||
      errorMsg.includes("invalid login")
    ) {
      return "Nieprawidłowy email lub hasło.";
    }

    // Token nieprawidłowy/wygasły
    if (
      errorMsg.includes("token") ||
      errorMsg.includes("expired") ||
      errorMsg.includes("invalid")
    ) {
      return "Link wygasł lub jest nieprawidłowy. Spróbuj ponownie.";
    }
  }

  // Domyślny komunikat błędu
  return "Wystąpił błąd. Spróbuj ponownie później.";
}

/**
 * Typy błędów autentykacji dla lepszej obsługi w komponentach.
 */
export type AuthErrorType =
  | "email_not_confirmed"
  | "rate_limit"
  | "invalid_credentials"
  | "server_error"
  | "network_error"
  | "token_expired"
  | "unknown";

/**
 * Identyfikuje typ błędu autentykacji.
 * 
 * @param error - Błąd z Supabase Auth
 * @returns Typ błędu
 */
export function getAuthErrorType(
  error: AuthError | Error | null | undefined
): AuthErrorType {
  if (!error) {
    return "unknown";
  }

  if (error instanceof TypeError) {
    return "network_error";
  }

  if ("message" in error && "status" in error) {
    const authError = error as AuthError;
    const errorMsg = authError.message.toLowerCase();
    const status = authError.status;

    if (
      errorMsg.includes("email not confirmed") ||
      errorMsg.includes("email_not_confirmed")
    ) {
      return "email_not_confirmed";
    }

    if (
      errorMsg.includes("rate limit") ||
      errorMsg.includes("too many requests") ||
      status === 429
    ) {
      return "rate_limit";
    }

    if (status && status >= 500) {
      return "server_error";
    }

    if (
      errorMsg.includes("password") ||
      errorMsg.includes("invalid credentials") ||
      errorMsg.includes("invalid login")
    ) {
      return "invalid_credentials";
    }

    if (
      errorMsg.includes("token") ||
      errorMsg.includes("expired") ||
      errorMsg.includes("invalid")
    ) {
      return "token_expired";
    }
  }

  return "unknown";
}
