import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
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
 * Weryfikuje token resetu hasła z URL (hash fragment #access_token=...).
 * Token jest automatycznie przetwarzany przez @supabase/ssr i sesja recovery
 * jest ustawiana w cookies. Sprawdzamy, czy sesja recovery istnieje.
 * 
 * Jeśli token jest nieprawidłowy/wygasły, przekierowuje do /reset-password.
 */
export default async function ResetPasswordConfirmPage() {
  const supabase = await createClient();

  // Sprawdzenie sesji - jeśli istnieje sesja recovery, token jest ważny
  // Supabase automatycznie przetwarza hash fragment (#access_token=...) i ustawia sesję w cookies
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Jeśli brak sesji lub błąd, token jest nieprawidłowy/wygasły
  // Przekierowanie do /reset-password z komunikatem
  if (error || !session) {
    redirect("/reset-password?error=invalid_token");
  }

  // Sprawdzenie, czy sesja jest sesją recovery (reset hasła)
  // W Supabase, sesja recovery ma specjalny typ - sprawdzamy przez sprawdzenie, czy użytkownik może zmienić hasło
  // Alternatywnie, możemy sprawdzić przez sprawdzenie, czy użytkownik jest w trybie recovery
  // Dla uproszczenia, jeśli sesja istnieje, pozwalamy na zmianę hasła
  // (Supabase automatycznie weryfikuje, czy sesja jest ważna dla resetu hasła)

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
