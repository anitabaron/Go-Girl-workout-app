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

  const supabase = await createClient();

  // Obsługa parametru `code` - wymiana kodu na sesję
  if (code) {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        // Kod nieprawidłowy/wygasły
        return NextResponse.redirect(
          new URL("/reset-password?error=invalid_token", requestUrl.origin)
        );
      }

      // Po wymianie kodu, przekieruj w zależności od typu
      if (type === "recovery") {
        return NextResponse.redirect(
          new URL("/reset-password/confirm", requestUrl.origin)
        );
      }

      // Domyślnie: potwierdzenie emaila
      return NextResponse.redirect(
        new URL("/login?confirmed=true", requestUrl.origin)
      );
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(
        new URL("/reset-password?error=invalid_token", requestUrl.origin)
      );
    }
  }

  // Obsługa hash fragmentu - Supabase automatycznie przetwarza hash fragment i ustawia sesję
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    // Token nieprawidłowy/wygasły
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", requestUrl.origin)
    );
  }

  // Przekierowanie w zależności od typu callbacku
  if (type === "recovery") {
    // Reset hasła - przekierowanie do strony potwierdzenia resetu hasła
    return NextResponse.redirect(
      new URL("/reset-password/confirm", requestUrl.origin)
    );
  }

  // Domyślnie: potwierdzenie emaila po rejestracji
  return NextResponse.redirect(
    new URL("/login?confirmed=true", requestUrl.origin)
  );
}
