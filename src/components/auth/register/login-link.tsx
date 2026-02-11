"use client";

import Link from "next/link";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";
import { useTranslations } from "@/i18n/client";

/**
 * Link do strony logowania dla użytkowniczek, które już mają konto.
 */
export function LoginLink() {
  const t = useTranslations("auth.registerForm");
  const { basePath } = useAuthRedirect();
  const loginHref = basePath ? `${basePath}/login` : "/login";
  return (
    <p className="text-sm text-muted-foreground">
      {t("haveAccount")}{" "}
      <Link
        href={loginHref}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("signIn")}
      </Link>
    </p>
  );
}
