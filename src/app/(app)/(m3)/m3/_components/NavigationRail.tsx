"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/m3", label: "Home", icon: Home },
  { href: "/m3/exercises", label: "Exercises", icon: Dumbbell },
] as const;

/**
 * M3 Navigation Rail - desktop: vertical rail on left; mobile: bottom nav bar.
 * Links: Home (/m3), Exercises (/m3/exercises).
 */
export function NavigationRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: vertical rail on left */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[80px] md:border-r md:border-border md:bg-card md:z-40"
      >
        <div className="flex flex-col items-center gap-2 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/m3" ? pathname === "/m3" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile: bottom nav bar */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card safe-area-pb"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/m3" ? pathname === "/m3" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
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
    </>
  );
}
