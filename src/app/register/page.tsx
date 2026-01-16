import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { RegisterForm } from "@/components/auth/register/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <Card className="w-full max-w-lg min-w-[320px]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Utwórz konto</CardTitle>
            <CardDescription>
              Zarejestruj się, aby rozpocząć treningi z Go Girl Workout App
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
