"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Gdy Supabase przekierowuje po kliknięciu linku resetu hasła, może wysłać użytkownika
 * na /login z tokenami w hash (#access_token=...&type=recovery). Ten komponent wykrywa
 * taki hash i przekierowuje na /reset-password/confirm, gdzie hash jest przetwarzany.
 */
export function RecoveryHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const hash = globalThis.window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    if (type === "recovery" && accessToken) {
      router.replace(`/reset-password/confirm${hash}`);
    }
  }, [router]);

  return null;
}
