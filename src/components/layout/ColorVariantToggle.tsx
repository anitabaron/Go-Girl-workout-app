"use client";

import { cn } from "@/lib/utils";
import { useM3ThemeStore, type M3ColorVariant } from "@/stores/m3-theme-store";
import { useTranslations } from "@/i18n/client";

type ColorVariantToggleProps = {
  className?: string;
};

const VARIANT_OPTIONS: ReadonlyArray<{
  value: M3ColorVariant;
  labelKey: string;
  dotClass: string;
}> = [
  {
    value: "pink",
    labelKey: "colorVariantPink",
    dotClass: "bg-[#df6671]",
  },
  {
    value: "expressive-teal",
    labelKey: "colorVariantExpressiveTeal",
    dotClass: "bg-[#006a6a]",
  },
] as const;

export function ColorVariantToggle({
  className,
}: Readonly<ColorVariantToggleProps>) {
  const t = useTranslations("theme");
  const colorVariant = useM3ThemeStore((state) => state.colorVariant);
  const setColorVariant = useM3ThemeStore((state) => state.setColorVariant);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--m3-radius-lg)] border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label={t("colorVariant")}
    >
      {VARIANT_OPTIONS.map((option) => {
        const isActive = colorVariant === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setColorVariant(option.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded-[var(--m3-radius-sm)] px-2 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            aria-label={t(option.labelKey)}
          >
            <span className={cn("size-2.5 rounded-full", option.dotClass)} />
            <span className="hidden lg:inline">{t(option.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
