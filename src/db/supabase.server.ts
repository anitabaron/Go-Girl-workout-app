import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

/**
 * Tworzy klienta Supabase dla Server Components i Server Actions w Next.js 16 App Router.
 * 
 * Ten klient używa @supabase/ssr do zarządzania sesjami przez cookies,
 * co zapewnia prawidłowe działanie autentykacji w środowisku server-side.
 * 
 * @returns {Promise<ReturnType<typeof createServerClient<Database>>>} Instancja klienta Supabase
 * 
 * @example
 * // W Server Component:
 * const supabase = await createClient();
 * const { data } = await supabase.from('exercises').select('*');
 * 
 * @example
 * // W Server Action:
 * 'use server';
 * export async function getExercises() {
 *   const supabase = await createClient();
 *   return await supabase.from('exercises').select('*');
 * }
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions, or you can handle it differently.
          }
        },
      },
    }
  );
}
