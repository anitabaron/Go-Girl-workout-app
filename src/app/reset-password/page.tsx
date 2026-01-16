import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Reset hasła | Go Girl Workout App",
  description: "Zresetuj swoje hasło do konta Go Girl Workout App",
};

export default function ResetPasswordPage() {
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
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
