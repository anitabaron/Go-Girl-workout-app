"use client";

import Link from "next/link";
import { useAuthRedirect } from "@/contexts/auth-redirect-context";

export function BackToLoginLink() {
  const { basePath } = useAuthRedirect();
  const loginHref = basePath ? `${basePath}/login` : "/login";
  return (
    <div className="text-center">
      <Link
        href={loginHref}
        className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        Wróć do logowania
      </Link>
    </div>
  );
}
