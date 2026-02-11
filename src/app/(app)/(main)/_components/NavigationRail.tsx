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
import { LanguageToggle } from "./LanguageToggle";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/db/supabase.client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useT, type MessageKey } from "@/i18n";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  labelKey: MessageKey;
  icon: typeof Home;
}> = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/exercises", labelKey: "nav.exercises", icon: Dumbbell },
  { href: "/workout-plans", labelKey: "nav.plans", icon: Calendar },
  { href: "/workout-sessions", labelKey: "nav.sessions", icon: History },
  { href: "/personal-records", labelKey: "nav.records", icon: Trophy },
  { href: "/workout-sessions/start", labelKey: "nav.start", icon: Play },
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
  t,
}: {
  pathname: string;
  user: User | null;
  onSignOut: () => void;
  t: (key: MessageKey) => string;
}) => (
  <nav
    aria-label={t("nav.mainNavigation")}
    className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-center border-t border-border bg-[var(--m3-surface-container)] shadow-[0_-2px_10px_rgb(0_0_0/0.08)] py-2 safe-area-pb"
  >
    <div className="flex w-full items-center justify-around h-16 px-2 py-2">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
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
              {t(labelKey)}
            </span>
          </Link>
        );
      })}
      {user ? (
        <button
          type="button"
          onClick={onSignOut}
          aria-label={t("auth.signOut")}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
          )}
        >
          <LogOut className="size-6 shrink-0" aria-hidden />
          <span className="text-[11px] font-medium truncate max-w-full">
            {t("auth.signOut")}
          </span>
        </button>
      ) : (
        <Link
          href="/login"
          prefetch={false}
          aria-label={t("auth.signIn")}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground active:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))]",
          )}
        >
          <LogIn className="size-6 shrink-0" aria-hidden />
          <span className="text-[11px] font-medium truncate max-w-full">
            {t("auth.signIn")}
          </span>
        </Link>
      )}
    </div>

    <div className="w-full px-3 pb-1 flex items-center justify-center gap-2">
      <LanguageToggle />
      <DarkModeToggle aria-label={t("theme.toggleDarkMode")} />
    </div>
  </nav>
);

export function NavigationRail() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const t = useT();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("auth.signOutError"));
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
        aria-label={t("nav.mainNavigation")}
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
                <span className="text-[10px] font-medium">{t(labelKey)}</span>
              </Link>
            );
          })}
          <div className="mt-auto pt-12 flex flex-col items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label={t("auth.signOut")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground",
                )}
              >
                <LogOut className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{t("auth.signOut")}</span>
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                aria-label={t("auth.signIn")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-w-[56px] h-14 rounded-[var(--m3-radius-lg)] transition-colors text-muted-foreground hover:bg-[color-mix(in_srgb,var(--m3-primary-container)_40%,var(--m3-surface-container))] hover:text-foreground",
                )}
              >
                <LogIn className="size-6" aria-hidden />
                <span className="text-[10px] font-medium">{t("auth.signIn")}</span>
              </Link>
            )}
            <LanguageToggle />
            <DarkModeToggle aria-label={t("theme.toggleDarkMode")} />
          </div>
        </div>
      </nav>

      <MobileNavContent
        pathname={pathname}
        user={user}
        onSignOut={handleSignOut}
        t={t}
      />
    </>
  );
}
