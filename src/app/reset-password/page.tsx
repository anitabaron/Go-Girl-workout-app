import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Reset hasła | Go Girl Workout App",
  description: "Zresetuj swoje hasło do konta Go Girl Workout App",
};

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;
  const error = params.error === "invalid_token";

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <Card className="w-full max-w-lg min-w-[320px]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset hasła</CardTitle>
            <CardDescription>
              Wprowadź swój adres email, a wyślemy Ci link do resetu hasła
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">
                  Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.
                </p>
              </div>
            )}
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
