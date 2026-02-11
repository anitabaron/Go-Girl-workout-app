import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { RegisterForm } from "@/components/auth/register/register-form";
import { getTranslations } from "@/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.registerPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.registerPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Card className="w-full max-w-lg min-w-[320px] border-[var(--m3-outline-variant)] rounded-[var(--m3-radius-large)] shadow-[var(--m3-shadow-1)]">
        <CardHeader className="space-y-1">
          <CardTitle className="m3-headline text-[var(--m3-on-surface)]">
            {t("title")}
          </CardTitle>
          <CardDescription className="m3-body text-[var(--m3-on-surface-variant)]">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
