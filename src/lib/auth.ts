import { createClient } from "@/db/supabase.server";

/**
 * Pobiera ID użytkownika z sesji Supabase lub zwraca DEFAULT_USER_ID z env.
 * Używane w Server Components do autentykacji.
 */
export async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return user.id;
  }

  // Fallback dla developmentu
  const defaultUserId = process.env.DEFAULT_USER_ID;

  if (!defaultUserId) {
    throw new Error("Brak aktywnej sesji i DEFAULT_USER_ID w środowisku.");
  }

  return defaultUserId;
}
