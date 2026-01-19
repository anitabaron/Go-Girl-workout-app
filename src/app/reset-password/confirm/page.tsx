import type { Metadata } from "next";
import { ResetPasswordConfirmForm } from "@/components/reset-password/confirm/reset-password-confirm-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Potwierdzenie resetu hasła | Go Girl Workout App",
  description: "Ustaw nowe hasło do konta Go Girl Workout App",
};

/**
 * Strona potwierdzenia resetu hasła.
 * 
 * Uwaga: Hash fragment (#access_token=...) jest dostępny tylko po stronie klienta.
 * Weryfikacja tokenu odbywa się w Client Component (ResetPasswordConfirmForm)
 * przez hook useResetPasswordConfirmForm, który sprawdza sesję recovery.
 * 
 * Server Component renderuje tylko layout - weryfikacja tokenu i obsługa błędów
 * są wykonywane w Client Component po stronie klienta.
 */
export default async function ResetPasswordConfirmPage() {
  // Nie sprawdzamy sesji w Server Component, ponieważ:
  // 1. Hash fragment (#access_token=...) nie jest dostępny w Server Component
  // 2. Supabase SSR może nie przetworzyć hash fragmentu przed renderowaniem Server Component
  // 3. Weryfikacja tokenu odbywa się w Client Component (hook useResetPasswordConfirmForm)
  
  // Renderujemy formularz - hook w Client Component zweryfikuje token i obsłuży błędy

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <Card className="w-full max-w-lg min-w-[320px]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Ustaw nowe hasło</CardTitle>
            <CardDescription>
              Wprowadź nowe hasło dla swojego konta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordConfirmForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
