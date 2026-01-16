import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Globalny store Zustand do zarządzania stanem autentykacji w Client Components.
 * 
 * Store synchronizuje stan użytkownika między Server Components a Client Components.
 * Server Components pobierają użytkownika przez `createClient()` i przekazują
 * do `AuthProvider`, który inicjalizuje store.
 * 
 * @example
 * // W Client Component:
 * const user = useAuthStore((state) => state.user);
 * const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  isAuthenticated: () => get().user !== null,
}));
