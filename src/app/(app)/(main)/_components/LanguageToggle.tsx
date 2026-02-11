"use client";

import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "@/i18n/client";
import type { Locale } from "@/i18n";
import { useRouter } from "next/navigation";

type LanguageToggleProps = {
  className?: string;
};

const LOCALE_OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: "pl", label: "PL" },
  { locale: "en", label: "EN" },
];

export function LanguageToggle({ className }: Readonly<LanguageToggleProps>) {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const t = useTranslations("lang");

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--m3-radius-lg)] border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label={t("switchAria")}
    >
      {LOCALE_OPTIONS.map((option) => {
        const isActive = option.locale === locale;

        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => {
              if (option.locale === locale) return;
              setLocale(option.locale);
              router.refresh();
            }}
            className={cn(
              "rounded-[var(--m3-radius-sm)] px-2 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            aria-label={
              option.locale === "pl" ? t("polish") : t("english")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
