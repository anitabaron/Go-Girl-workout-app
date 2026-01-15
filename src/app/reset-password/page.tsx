import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password/reset-password-form";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata: Metadata = {
  title: "Reset hasła | Go Girl Workout App",
  description: "Zresetuj swoje hasło do konta Go Girl Workout App",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <PageHeader showBack={false} />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Reset hasła
            </h1>
          </header>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
