"use client";

import Link from "next/link";

/**
 * Link do strony logowania dla użytkowniczek, które już mają konto.
 */
export function LoginLink() {
  return (
    <p className="text-sm text-muted-foreground">
      Masz już konto?{" "}
      <Link
        href="/login"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Zaloguj się
      </Link>
    </p>
  );
}
