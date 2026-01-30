import { createClient } from "@/db/supabase.server";

/**
 * Pobiera ID użytkownika z sesji Supabase dla API routes.
 * Rzuca Error("UNAUTHORIZED") gdy brak zalogowanego użytkownika.
 *
 * Używane wyłącznie w API route handlers – dla Server Components
 * używaj getUserId() lub requireAuth() z @/lib/auth.
 *
 * @returns {Promise<string>} ID użytkownika
 * @throws {Error} "UNAUTHORIZED" gdy brak sesji
 */
export async function getUserIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return user.id;
}
