"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/db/supabase.client";

interface AuthProviderProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * AuthProvider - Client Component inicjalizujący authStore z danymi użytkownika.
 * 
 * Provider synchronizuje stan autentykacji między Server Components a Client Components:
 * - Inicjalizuje Zustand store z danymi użytkownika z Server Component
 * - Subskrybuje zmiany stanu autentykacji Supabase (onAuthStateChange)
 * - Automatycznie aktualizuje store przy zmianie sesji (logowanie, wylogowanie)
 * 
 * @example
 * // W Server Component (layout):
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * 
 * return (
 *   <AuthProvider user={user}>
 *     {children}
 *   </AuthProvider>
 * );
 */
export function AuthProvider({ user, children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  // Inicjalizacja store z danymi użytkownika z Server Component
  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  // Subskrypcja zmian stanu autentykacji Supabase
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Automatyczne czyszczenie store przy wylogowaniu
        clearUser();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Aktualizacja store przy logowaniu lub odświeżeniu tokenu
        if (session?.user) {
          setUser(session.user);
        }
      } else if (event === "USER_UPDATED") {
        // Aktualizacja danych użytkownika
        if (session?.user) {
          setUser(session.user);
        }
      }
    });

    // Cleanup subscription przy unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clearUser]);

  return <>{children}</>;
}
