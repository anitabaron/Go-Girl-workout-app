import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { LoginForm } from "@/components/auth/login/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Logowanie | Go Girl Workout App",
  description:
    "Zaloguj się do swojego konta Go Girl Workout App, aby uzyskać dostęp do ćwiczeń, planów treningowych i sesji treningowych",
};

export default async function M3LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user !== null) {
    redirect("/m3");
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-lg min-w-[320px] border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-1)]">
        <CardHeader className="space-y-1">
          <CardTitle className="m3-headline text-[var(--m3-on-surface)]">
            Zaloguj się
          </CardTitle>
          <CardDescription className="m3-body text-[var(--m3-on-surface-variant)]">
            Wprowadź swoje dane, aby uzyskać dostęp do konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
