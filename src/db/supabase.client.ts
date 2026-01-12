import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

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
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const DEFAULT_USER_ID = "6f6b1fa9-d016-46c7-af12-5b4f03b0308c";
