"use server";

import { cookies } from "next/headers";

const DESIGN_COOKIE = "design_mode";

export type DesignMode = "legacy" | "m3";

/**
 * Ustawia preferencję designu (legacy vs M3).
 * Cookie jest używane przez middleware do rewrite.
 */
export async function setDesignMode(mode: DesignMode) {
  const cookieStore = await cookies();
  cookieStore.set(DESIGN_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 rok
  });
}
