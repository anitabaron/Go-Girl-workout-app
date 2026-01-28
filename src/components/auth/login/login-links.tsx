"use client";

import Link from "next/link";

export function LoginLinks() {
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      {/* Plain <a> for reliable E2E navigation; full page load so Playwright sees URL change */}
      <a
        href="/reset-password"
        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        data-test-id="login-forgot-password-link"
      >
        Nie pamiętasz hasła?
      </a>
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
