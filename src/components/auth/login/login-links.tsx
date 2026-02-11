"use client";

import Link from "next/link";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";
import { useTranslations } from "@/i18n/client";

export function LoginLinks() {
  const t = useTranslations("auth.loginForm");
  const { basePath } = useAuthRedirect();
  const resetHref = basePath ? `${basePath}/reset-password` : "/reset-password";
  const registerHref = basePath ? `${basePath}/register` : "/register";
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <Link
        href={resetHref}
        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        {t("forgotPassword")}
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{t("noAccount")}</span>
        <Link
          href={registerHref}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm font-medium"
        >
          {t("register")}
        </Link>
      </div>
    </div>
  );
}
