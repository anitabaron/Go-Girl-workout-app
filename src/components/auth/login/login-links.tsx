"use client";

import Link from "next/link";

export function LoginLinks() {
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <Link
        href="/reset-password"
        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        Nie pamiętasz hasła?
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Nie masz konta?</span>
        <Link
          href="/register"
          className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm font-medium"
        >
          Zarejestruj się
        </Link>
      </div>
    </div>
  );
}
