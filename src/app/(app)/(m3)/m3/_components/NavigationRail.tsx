"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Play, Dumbbell, Calendar, History, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";

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
const MobileNavContent = ({ pathname }: { pathname: string }) => (
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
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium truncate max-w-full">
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  </nav>
);

export function NavigationRail() {
  const pathname = usePathname();

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
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <div className="mt-auto pt-4">
            <DarkModeToggle aria-label="Przełącz tryb ciemny" />
          </div>
        </div>
      </nav>

      {/* Mobile: bottom nav bar - fixed in layout, always visible on mobile */}
      <MobileNavContent pathname={pathname} />
    </>
  );
}
