"use client";

import Link from "next/link";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";

export function LoginLinks() {
  const { basePath } = useAuthRedirect();
  const resetHref = basePath ? `${basePath}/reset-password` : "/reset-password";
  const registerHref = basePath ? `${basePath}/register` : "/register";
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <Link
        href={resetHref}
        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        Nie pamiętasz hasła?
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Nie masz konta?</span>
        <Link
          href={registerHref}
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm font-medium"
        >
          Zarejestruj się
        </Link>
      </div>
    </div>
  );
}
