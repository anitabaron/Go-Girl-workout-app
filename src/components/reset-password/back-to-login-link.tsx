"use client";

import Link from "next/link";

export function BackToLoginLink() {
  return (
    <div className="text-center">
      <Link
        href="/login"
        className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        Wróć do logowania
      </Link>
    </div>
  );
}
