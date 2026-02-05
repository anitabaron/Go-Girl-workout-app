"use client";

import Link from "next/link";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";

/**
 * Link do strony logowania dla użytkowniczek, które już mają konto.
 */
export function LoginLink() {
  const { basePath } = useAuthRedirect();
  const loginHref = basePath ? `${basePath}/login` : "/login";
  return (
    <p className="text-sm text-muted-foreground">
      Masz już konto?{" "}
      <Link
        href={loginHref}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Zaloguj się
      </Link>
    </p>
  );
}
