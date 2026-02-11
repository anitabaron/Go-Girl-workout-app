"use client";

import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n";
import type { Locale } from "@/i18n";

type LanguageToggleProps = {
  className?: string;
};

const LOCALE_OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: "pl", label: "PL" },
  { locale: "en", label: "EN" },
];

export function LanguageToggle({ className }: Readonly<LanguageToggleProps>) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--m3-radius-lg)] border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label={t("lang.switchAria")}
    >
      {LOCALE_OPTIONS.map((option) => {
        const isActive = option.locale === locale;

        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => setLocale(option.locale)}
            className={cn(
              "rounded-[var(--m3-radius-sm)] px-2 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            aria-label={
              option.locale === "pl" ? t("lang.polish") : t("lang.english")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
