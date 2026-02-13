"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Play,
  Dumbbell,
  Calendar,
  History,
  Trophy,
  BarChart3,
  LogIn,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./DarkModeToggle";
import { ColorVariantToggle } from "./ColorVariantToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/db/supabase.client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useTranslations } from "@/i18n/client";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  labelKey: string;
  icon: typeof Home;
}> = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/exercises", labelKey: "exercises", icon: Dumbbell },
  { href: "/workout-plans", labelKey: "plans", icon: Calendar },
  { href: "/workout-sessions", labelKey: "sessions", icon: History },
  { href: "/personal-records", labelKey: "records", icon: Trophy },
  { href: "/statistics", labelKey: "statistics", icon: BarChart3 },
  { href: "/workout-sessions/start", labelKey: "start", icon: Play },
] as const;

function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/workout-sessions")
    return (
      pathname.startsWith("/workout-sessions") &&
      !pathname.startsWith("/workout-sessions/start")
    );
  return pathname.startsWith(href);
}

const MobileNavContent = ({
  pathname,
  user,
  onSignOut,
  tNav,
  tAuth,
  tTheme,
}: {
  pathname: string;
  user: User | null;
  onSignOut: () => void;
  tNav: (key: string) => string;
  tAuth: (key: string) => string;
  tTheme: (key: string) => string;
}) => {
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isMobileSettingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSettingsOpen]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-black/45 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isMobileSettingsOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setIsMobileSettingsOpen(false)}
        aria-label={tNav("menuClose")}
      />

      <nav
        aria-label={tNav("mainNavigation")}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-center border-t border-border bg-[var(--m3-surface-container)] shadow-[0_-2px_10px_rgb(0_0_0/0.08)] py-2 safe-area-pb"
      >
        <div
          id="mobile-nav-settings"
          className={cn(
            "md:hidden absolute bottom-full left-0 right-0 border-t border-border bg-[var(--m3-surface-container)] px-3 py-3 will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isMobileSettingsOpen
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-6 opacity-0 pointer-events-none",
          )}
          aria-hidden={!isMobileSettingsOpen}
        >
          <div className="flex items-center justify-center gap-2">
            <LanguageToggle />
            <ColorVariantToggle />
            <DarkModeToggle aria-label={tTheme("toggleDarkMode")} />
            {user ? (
              <button
                type="button"
                onClick={onSignOut}
                aria-label={tAuth("signOut")}
                className="inline-flex items-center gap-1 rounded-[var(--m3-radius-lg)] border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                {tAuth("signOut")}
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                aria-label={tAuth("signIn")}
                onClick={() => setIsMobileSettingsOpen(false)}
                className="inline-flex items-center gap-1 rounded-[var(--m3-radius-lg)] border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LogIn className="size-4 shrink-0" aria-hidden />
                {tAuth("signIn")}
              </Link>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-around h-16 px-2 py-2">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const isActive = isNavItemActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMobileSettingsOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0 xs:gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
                  isActive
                    ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-6 shrink-0" aria-hidden />
                <span className="hidden xs:block text-[11px] font-medium truncate max-w-full">
                  {tNav(labelKey)}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileSettingsOpen((prev) => !prev)}
            aria-label={tNav("menu")}
            aria-controls="mobile-nav-settings"
            aria-expanded={isMobileSettingsOpen}
            className={cn(
              "md:hidden flex flex-col items-center justify-center gap-0 xs:gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
              isMobileSettingsOpen &&
                "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]",
            )}
          >
            {isMobileSettingsOpen ? (
              <X className="size-6 shrink-0" aria-hidden />
            ) : (
              <Menu className="size-6 shrink-0" aria-hidden />
            )}
            <span className="hidden xs:block text-[11px] font-medium truncate max-w-full">
              {tNav("menu")}
            </span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label={tAuth("signOut")}
              className={cn(
                "hidden md:flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
              )}
            >
              <LogOut className="size-6 shrink-0" aria-hidden />
              <span className="text-[11px] font-medium truncate max-w-full">
                {tAuth("signOut")}
              </span>
            </button>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              aria-label={tAuth("signIn")}
              onClick={() => setIsMobileSettingsOpen(false)}
              className={cn(
                "hidden md:flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
              )}
            >
              <LogIn className="size-6 shrink-0" aria-hidden />
              <span className="text-[11px] font-medium truncate max-w-full">
                {tAuth("signIn")}
              </span>
            </Link>
          )}
        </div>

        <div className="hidden md:flex w-full px-3 pb-1 items-center justify-center gap-2">
          <ColorVariantToggle />
          <DarkModeToggle aria-label={tTheme("toggleDarkMode")} />
        </div>
      </nav>
    </>
  );
};

export function NavigationRail() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tTheme = useTranslations("theme");

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(tAuth("signOutError"));
      console.error("Sign out error:", error);
      return;
    }
    clearUser();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <nav
        aria-label={tNav("mainNavigation")}
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[80px] md:border-r md:border-border md:bg-card md:z-40"
      >
        <div className="flex flex-col items-center gap-1 py-4 px-2">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
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
                <span className="text-[10px] font-medium">{tNav(labelKey)}</span>
              </Link>
            );
          })}
          <div className="mt-auto pt-12 flex flex-col items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label={tAuth("signOut")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground",
                )}
              >
                <LogOut className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{tAuth("signOut")}</span>
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                aria-label={tAuth("signIn")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground",
                )}
              >
                <LogIn className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{tAuth("signIn")}</span>
              </Link>
            )}
            <DarkModeToggle aria-label={tTheme("toggleDarkMode")} />
            <ColorVariantToggle />
          </div>
        </div>
      </nav>

      <MobileNavContent
        pathname={pathname}
        user={user}
        onSignOut={handleSignOut}
        tNav={tNav}
        tAuth={tAuth}
        tTheme={tTheme}
      />
    </>
  );
}
