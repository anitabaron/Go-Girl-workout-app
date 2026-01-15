"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationItems } from "./navigation-items";
import { QuickStartButton } from "./quick-start-button";
import { UserMenu } from "./user-menu";
import type { User } from "@supabase/supabase-js";

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
}: TopNavigationProps) {
  const pathname = usePathname();
  const currentSection =
    activeSection ??
    navigationItems.find((item) => pathname.startsWith(item.href))?.id;

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

        {/* Quick Start Button and User Menu / Login Link */}
        <div className="flex items-center gap-3">
          <QuickStartButton variant="button" />
          {user ? (
            <UserMenu user={user} />
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
