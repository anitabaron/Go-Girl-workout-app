import type { Metadata } from "next";
import { ResetPasswordConfirmForm } from "@/components/reset-password/confirm/reset-password-confirm-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Potwierdzenie resetu hasła | Go Girl Workout App",
  description: "Ustaw nowe hasło do konta Go Girl Workout App",
};

export default async function M3ResetPasswordConfirmPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-lg min-w-[320px] border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-1)]">
        <CardHeader className="space-y-1">
          <CardTitle className="m3-headline text-[var(--m3-on-surface)]">
            Ustaw nowe hasło
          </CardTitle>
          <CardDescription className="m3-body text-[var(--m3-on-surface-variant)]">
            Wprowadź nowe hasło dla swojego konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordConfirmForm />
        </CardContent>
      </Card>
    </div>
  );
}
