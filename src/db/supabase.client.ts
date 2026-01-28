import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/**
 * Klient Supabase dla Client Components w Next.js 16 App Router.
 *
 * Ten klient używa @supabase/ssr do zarządzania sesjami przez cookies,
 * co zapewnia synchronizację sesji między server i client components.
 *
 * Użyj tego klienta w komponentach oznaczonych "use client".
 *
 * @example
 * "use client";
 * import { supabase } from "@/db/supabase.client";
 *
 * export function MyComponent() {
 *   const { data } = await supabase.from('exercises').select('*');
 * }
 */
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Important for recovery flow: ensure the client can pick up tokens from URL
      // (hash fragment / implicit flow) and persist session.
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
