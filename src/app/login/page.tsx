import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { LoginForm } from "@/components/auth/login/login-form";
import { RecoveryHashRedirect } from "@/components/auth/login/recovery-hash-redirect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Logowanie | Go Girl Workout App",
  description: "Zaloguj się do swojego konta Go Girl Workout App, aby uzyskać dostęp do ćwiczeń, planów treningowych i sesji treningowych",
};

export default async function LoginPage() {
  const supabase = await createClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (e) {
    // Session cookie może być uszkodzony (np. surowy JWT) – traktuj jak brak sesji
    console.warn("getUser failed on login page, treating as unauthenticated:", e);
  }

  // Przekierowanie zalogowanych użytkowniczek do strony głównej
  if (user !== null) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <RecoveryHashRedirect />
      <PageHeader showBack={false} />
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <Card className="w-full max-w-lg min-w-[320px]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Zaloguj się</CardTitle>
            <CardDescription>
              Wprowadź swoje dane, aby uzyskać dostęp do konta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
