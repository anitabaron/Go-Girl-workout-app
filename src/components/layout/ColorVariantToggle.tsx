"use client";

import { Palette } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useM3ThemeStore, type M3ColorVariant } from "@/stores/m3-theme-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ColorVariantToggleProps = {
  className?: string;
};

const VARIANT_OPTIONS: ReadonlyArray<{
  value: M3ColorVariant;
  labelKey: string;
  dotClass: string;
}> = [
  {
    value: "monochrome",
    labelKey: "colorVariantMonochrome",
    dotClass: "bg-[#6b7280]",
  },
  { value: "orange", labelKey: "colorVariantOrange", dotClass: "bg-[#f59e0b]" },
  { value: "blue", labelKey: "colorVariantBlue", dotClass: "bg-[#2563eb]" },
  { value: "violet", labelKey: "colorVariantViolet", dotClass: "bg-[#7c3aed]" },
  { value: "pink", labelKey: "colorVariantPink", dotClass: "bg-[#df6671]" },
] as const;

export function ColorVariantToggle({
  className,
}: Readonly<ColorVariantToggleProps>) {
  const t = useTranslations("theme");
  const colorVariant = useM3ThemeStore((state) => state.colorVariant);
  const setColorVariant = useM3ThemeStore((state) => state.setColorVariant);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "size-12 rounded-full border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] text-[var(--m3-primary)] shadow-[var(--m3-shadow-1)]",
            "inline-flex items-center justify-center transition-colors",
            "hover:bg-[var(--m3-surface-container-highest)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label={t("colorVariant")}
        >
          <Palette className="size-5" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-[17rem] rounded-[var(--m3-radius-large)] border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] p-2.5 shadow-[var(--m3-shadow-2)] backdrop-blur-sm"
      >
        <DropdownMenuLabel className="px-3 py-1 text-xs text-muted-foreground">
          {t("colorVariant")}
        </DropdownMenuLabel>

        {VARIANT_OPTIONS.map((option) => {
          const isActive = colorVariant === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setColorVariant(option.value)}
              className={cn(
                "rounded-[var(--m3-radius-sm)] px-3 py-2.5 text-[15px]",
                isActive &&
                  "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] font-medium",
              )}
            >
              <span className={cn("mr-1 size-3 rounded-full", option.dotClass)} />
              <span>{t(option.labelKey)}</span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="mx-2 my-2" />

        <DropdownMenuItem
          disabled
          className="rounded-[var(--m3-radius-sm)] px-3 py-2.5 text-[15px] text-muted-foreground"
        >
          <span className="mr-1 size-3 rounded-full bg-muted-foreground/60" />
          <span>{t("colorVariantCustomize")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
