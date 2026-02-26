import { createClient } from "@/db/supabase.server";
import { NextResponse } from "next/server";

/**
 * API Route Handler dla callbacków z Supabase Auth.
 * 
 * Obsługuje:
 * - Potwierdzenie emaila po rejestracji (jeśli enable_email_autoconfirm = false)
 * - Reset hasła (alternatywny przepływ, jeśli Supabase przekierowuje przez callback)
 * 
 * Supabase może przekierowywać do tego endpointu z parametrami:
 * - type=recovery - reset hasła
 * - type=signup - potwierdzenie emaila
 * - code=... - kod do wymiany na sesję (alternatywny format)
 * 
 * Hash fragment (#access_token=...) jest automatycznie przetwarzany przez @supabase/ssr
 * i sesja jest ustawiana w cookies.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const tokenHash =
    requestUrl.searchParams.get("token_hash") ?? requestUrl.searchParams.get("token");

  const supabase = await createClient();

  const redirectToRecoveryConfirm = () =>
    NextResponse.redirect(new URL("/reset-password/confirm", requestUrl.origin));

  const redirectToRecoveryInvalid = () =>
    NextResponse.redirect(
      new URL("/reset-password?error=invalid_token", requestUrl.origin)
    );

  const redirectToLoginConfirmed = () =>
    NextResponse.redirect(new URL("/login?confirmed=true", requestUrl.origin));

  // Obsługa parametru `code` - wymiana kodu na sesję
  if (code) {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        // Kod nieprawidłowy/wygasły
        return redirectToRecoveryInvalid();
      }

      // Po wymianie kodu, przekieruj w zależności od typu
      if (type === "recovery") {
        return redirectToRecoveryConfirm();
      }

      // Domyślnie: potwierdzenie emaila
      return redirectToLoginConfirmed();
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      return redirectToRecoveryInvalid();
    }
  }

  // Obsługa linków opartych o token_hash/token (fallback dla różnych formatów linków)
  if (type && tokenHash) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        type: type as "recovery" | "signup" | "invite" | "email_change" | "magiclink",
        token_hash: tokenHash,
      });

      if (error) {
        console.error("Error verifying auth token:", error);
        return type === "recovery" ? redirectToRecoveryInvalid() : redirectToLoginConfirmed();
      }

      return type === "recovery" ? redirectToRecoveryConfirm() : redirectToLoginConfirmed();
    } catch (error) {
      console.error("Error verifying auth token:", error);
      return type === "recovery" ? redirectToRecoveryInvalid() : redirectToLoginConfirmed();
    }
  }

  // Fallback bez `code`/`token_hash`: nie sprawdzamy sesji po stronie serwera, bo fragment URL
  // (#access_token=...) nie jest wysyłany do route handlera. Kierujemy użytkownika dalej.
  if (type === "recovery") {
    return redirectToRecoveryConfirm();
  }

  return redirectToLoginConfirmed();
}
