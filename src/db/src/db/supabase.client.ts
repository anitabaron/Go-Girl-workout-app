import { createBrowserClient } from "@supabase/ssr";

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
 * import { supabase } from "@/db/src/db/supabase.client";
 * 
 * export function MyComponent() {
 *   const { data } = await supabase.from('exercises').select('*');
 * }
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
