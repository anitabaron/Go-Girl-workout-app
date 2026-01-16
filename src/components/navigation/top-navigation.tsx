"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationItems } from "./navigation-items";
import { QuickStartButton } from "./quick-start-button";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/db/supabase.client";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface TopNavigationProps {
  user?: User | null;
  activeSection?: string;
}

/**
 * Client Component renderujący górny pasek nawigacji na desktop (≥768px).
 * Zawiera logo, zakładki nawigacyjne, przycisk "Start treningu" i menu użytkowniczki.
 */
export function TopNavigation({
  user,
  activeSection,
}: Readonly<TopNavigationProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const currentSection =
    activeSection ??
    navigationItems.find((item) => pathname.startsWith(item.href))?.id;

  const clearUser = useAuthStore((state) => state.clearUser);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Nie udało się wylogować. Spróbuj ponownie.");
      console.error("Sign out error:", error);
      return;
    }

    // Czyszczenie Zustand store
    clearUser();

    // Kolejność operacji: signOut() → clearUser() → router.push() → router.refresh()
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Główna nawigacja"
    >
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 sm:px-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2 font-bold text-lg"
          aria-label="Strona główna"
        >
          <span>Go Girl</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-1">
            {navigationItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                    isActive
                      ? "text-primary underline underline-offset-4"
                      : "text-muted-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Start Button and Login/Logout Button */}
        <div className="flex items-center gap-3">
          <QuickStartButton variant="button" />
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
            >
              WYloguj
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
            >
              Zaloguj
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
