"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navigationItems } from "./navigation-items";
import { QuickStartButton } from "./quick-start-button";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/db/supabase.client";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface BottomNavigationProps {
  user?: User | null;
  activeSection?: string;
}

/**
 * Client Component renderujący dolny pasek nawigacji na mobile (<768px).
 * Zawiera ikony z etykietami dla każdej sekcji oraz wyróżniony przycisk "Start treningu" jako FAB.
 */
export function BottomNavigation({
  user,
  activeSection,
}: Readonly<BottomNavigationProps>) {
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

  // Filtrujemy elementy nawigacji, aby wykluczyć "workout-sessions" z listy (bo jest w środku jako FAB)
  const navItemsForBottom = navigationItems.filter(
    (item) => item.id !== "workout-sessions"
  );

  return (
    <nav
      className="fixed bottom-0 z-50 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="navigation"
      aria-label="Nawigacja mobilna"
    >
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-around px-4">
        {/* Left side navigation items */}
        <div className="flex flex-1 items-center justify-around">
          {navItemsForBottom.slice(0, 2).map((item) => {
            const isActive = currentSection === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">
                  {item.mobileLabel ?? item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Center FAB */}
        <div className="flex items-center justify-center px-2">
          <QuickStartButton variant="fab" />
        </div>

        {/* Right side navigation items */}
        <div className="flex flex-1 items-center justify-around">
          {/* Historia sesji */}
          <Link
            href="/workout-sessions"
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
              currentSection === "workout-sessions"
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }`}
            aria-current={
              currentSection === "workout-sessions" ? "page" : undefined
            }
            aria-label="Historia sesji"
          >
            {(() => {
              const HistoryIcon = navigationItems.find(
                (item) => item.id === "workout-sessions"
              )?.icon;
              return HistoryIcon ? <HistoryIcon className="h-5 w-5" /> : null;
            })()}
            <span className="text-xs">Historia</span>
          </Link>

          {/* Rekordy */}
          {navItemsForBottom.slice(2).map((item) => {
            const isActive = currentSection === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">
                  {item.mobileLabel ?? item.label}
                </span>
              </Link>
            );
          })}

          {/* Login/Logout Button */}
          {user ? (
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors text-muted-foreground hover:text-primary"
              aria-label="Wyloguj"
            >
              <span className="text-xs">WYloguj</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors text-muted-foreground hover:text-primary"
              aria-label="Zaloguj"
            >
              <span className="text-xs">Zaloguj</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
