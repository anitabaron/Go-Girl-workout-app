import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-lg min-w-[320px] border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-1)]">
        <CardHeader className="space-y-1">
          <CardTitle className="m3-headline text-[var(--m3-on-surface)]">
            Reset hasła
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              className="mb-4 rounded-[var(--m3-radius-md)] p-3"
              style={{
                background:
                  "color-mix(in srgb, var(--destructive) 12%, transparent)",
              }}
            >
              <p className="text-sm text-destructive">
                Link resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy
                link.
              </p>
            </div>
          )}
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
