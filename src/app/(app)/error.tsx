"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Boundary dla wszystkich stron w (app) route group.
 * 
 * Przechwytuje błędy z Server Components i:
 * - Wykrywa błędy autoryzacji (brak sesji) → przekierowanie do /login
 * - Obsługuje inne błędy → wyświetlenie komunikatu z możliwością resetu
 * 
 * @example
 * // W Server Component:
 * export default async function ProtectedPage() {
 *   const userId = await requireAuth(); // Jeśli rzuca błąd, Error Boundary go przechwytuje
 *   return <div>Protected content</div>;
 * }
 */
export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Wykrywanie błędów autoryzacji
    const errorMessage = error.message.toLowerCase();
    
    if (
      errorMessage.includes("brak aktywnej sesji") ||
      errorMessage.includes("brak sesji") ||
      errorMessage.includes("session") ||
      errorMessage.includes("autoryzacja") ||
      errorMessage.includes("unauthorized") ||
      error.digest?.includes("auth")
    ) {
      // Przekierowanie do logowania z komunikatem o wygasłej sesji
      router.push("/login?error=session_expired");
      return;
    }

    // Logowanie innych błędów do konsoli (w development)
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught error:", error);
    }
  }, [error, router]);

  // Jeśli błąd autoryzacji, nie renderuj UI (przekierowanie już nastąpiło)
  const errorMessage = error.message.toLowerCase();
  const isAuthError =
    errorMessage.includes("brak aktywnej sesji") ||
    errorMessage.includes("brak sesji") ||
    errorMessage.includes("session") ||
    errorMessage.includes("autoryzacja") ||
    errorMessage.includes("unauthorized") ||
    error.digest?.includes("auth");

  if (isAuthError) {
    // Renderuj pusty div podczas przekierowania
    return null;
  }

  // Renderowanie UI dla innych błędów
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-destructive">
            Wystąpił błąd
          </CardTitle>
          <CardDescription>
            Wystąpił nieoczekiwany błąd podczas ładowania strony.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Spróbuj ponownie
            </Button>
            <Button onClick={() => router.push("/")} variant="outline">
              Wróć do strony głównej
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
