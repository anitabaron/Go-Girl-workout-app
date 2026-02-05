"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Play,
  Dumbbell,
  Calendar,
  History,
  Trophy,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/db/supabase.client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/m3", label: "Home", icon: Home },
  { href: "/m3/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/m3/workout-plans", label: "Plans", icon: Calendar },
  { href: "/m3/workout-sessions", label: "Sessions", icon: History },
  { href: "/m3/personal-records", label: "Records", icon: Trophy },
  { href: "/m3/workout-sessions/start", label: "Start", icon: Play },
] as const;

function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/m3") return pathname === "/m3";
  if (href === "/m3/workout-sessions")
    return (
      pathname.startsWith("/m3/workout-sessions") &&
      !pathname.startsWith("/m3/workout-sessions/start")
    );
  return pathname.startsWith(href);
}

/**
 * M3 Navigation Rail - desktop: vertical rail on left; mobile: bottom nav bar.
 * Active item on primaryContainer (tonal pill), icon + label, rounded.
 */
const MobileNavContent = ({
  pathname,
  user,
  onSignOut,
}: {
  pathname: string;
  user: User | null;
  onSignOut: () => void;
}) => (
  <nav
    aria-label="Main navigation"
    className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-center border-t border-border bg-[var(--m3-surface-container)] shadow-[0_-2px_10px_rgb(0_0_0/0.08)] py-2 safe-area-pb"
  >
    <div className="flex w-full items-center justify-around h-16 px-2 py-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = isNavItemActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
              isActive
                ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                : "text-muted-foreground"
            )}
          >
            <Icon className="size-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium truncate max-w-full">
              {label}
            </span>
          </Link>
        );
      })}
      {user ? (
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Wyloguj"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]"
          )}
        >
          <LogOut className="size-6 shrink-0" aria-hidden />
          <span className="text-[11px] font-medium truncate max-w-full">
            Wyloguj
          </span>
        </button>
      ) : (
        <Link
          href="/login"
          prefetch={false}
          aria-label="Zaloguj"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]"
          )}
        >
          <LogIn className="size-6 shrink-0" aria-hidden />
          <span className="text-[11px] font-medium truncate max-w-full">
            Zaloguj
          </span>
        </Link>
      )}
    </div>
  </nav>
);

export function NavigationRail() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Nie udało się wylogować. Spróbuj ponownie.");
      console.error("Sign out error:", error);
      return;
    }
    clearUser();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* Desktop: vertical rail - M3 style with primaryContainer active pill */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[80px] md:border-r md:border-border md:bg-card md:z-40"
      >
        <div className="flex flex-col items-center gap-1 py-4 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isNavItemActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors",
                  isActive
                    ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground"
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <div className="mt-auto pt-16 flex flex-col items-center gap-1">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Wyloguj"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground"
                )}
              >
                <LogOut className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">Wyloguj</span>
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                aria-label="Zaloguj"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground"
                )}
              >
                <LogIn className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">Zaloguj</span>
              </Link>
            )}
            <DarkModeToggle aria-label="Przełącz tryb ciemny" />
          </div>
        </div>
      </nav>

      {/* Mobile: bottom nav bar - fixed in layout, always visible on mobile */}
      <MobileNavContent
        pathname={pathname}
        user={user}
        onSignOut={handleSignOut}
      />
    </>
  );
}
