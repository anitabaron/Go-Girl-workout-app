import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { RegisterForm } from "@/components/auth/register/register-form";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Rejestracja | Go Girl Workout App",
  description: "Utwórz nowe konto w aplikacji Go Girl Workout App",
};

/**
 * Strona rejestracji użytkowniczki.
 * Sprawdza, czy użytkowniczka jest już zalogowana i przekierowuje, jeśli tak.
 */
export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jeśli użytkowniczka jest już zalogowana, przekieruj do głównej strony
  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Utwórz konto
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Zarejestruj się, aby rozpocząć treningi z Go Girl Workout App
            </p>
          </header>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
