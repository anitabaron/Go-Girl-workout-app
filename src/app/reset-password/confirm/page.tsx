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
 * Uwaga: Weryfikacja tokenu z URL i logika backendowa będzie zaimplementowana w dalszej kolejności.
 * Na razie strona renderuje tylko formularz UI.
 */
export default function ResetPasswordConfirmPage() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
