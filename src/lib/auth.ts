import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";

/**
 * Pobiera ID użytkownika z sesji Supabase.
 * Używane w Server Components do autentykacji.
 * 
 * @throws {Error} Jeśli brak aktywnej sesji
 * @returns {Promise<string>} ID użytkownika
 * 
 * @example
 * // W Server Component:
 * const userId = await getUserId();
 * const { data } = await supabase.from('exercises').select('*').eq('user_id', userId);
 */
export async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("Brak aktywnej sesji użytkownika.");
  }

  return user.id;
}

/**
 * Wymaga autoryzacji użytkownika - automatycznie przekierowuje do /login przy braku sesji.
 * 
 * Sprawdza sesję użytkownika i przekierowuje do logowania jeśli brak autoryzacji.
 * Używane w Server Components do ochrony stron przed nieautoryzowanym dostępem.
 * 
 * @returns {Promise<string>} ID użytkownika
 * @throws {never} Zawsze przekierowuje do /login zamiast rzucać błąd
 * 
 * @example
 * // W Server Component:
 * export default async function ProtectedPage() {
 *   const userId = await requireAuth();
 *   // Strona jest chroniona - użytkownik jest zalogowany
 *   return <div>Protected content</div>;
 * }
 */
export async function requireAuth(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    return user.id;
  }

  // Brak sesji - przekierowanie do logowania
  redirect("/login?error=session_expired");
}
