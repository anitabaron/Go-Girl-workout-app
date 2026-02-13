"use client";

import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { AutosaveStatus } from "@/types/workout-session-assistant";
import { useTranslations } from "@/i18n/client";

type AutosaveIndicatorM3Props = {
  status: AutosaveStatus;
  errorMessage?: string;
};

export function AutosaveIndicatorM3({
  status,
  errorMessage,
}: Readonly<AutosaveIndicatorM3Props>) {
  const t = useTranslations("assistantAutosave");

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: Loader2,
          text: t("saving"),
          className: "text-muted-foreground",
        };
      case "saved":
        return {
          icon: CheckCircle2,
          text: t("saved"),
          className: "text-primary",
        };
      case "error":
        return {
          icon: AlertCircle,
          text: errorMessage || t("error"),
          className: "text-destructive",
        };
      default:
        return {
          icon: null,
          text: "",
          className: "",
        };
    }
  };

  const config = getStatusConfig();

  if (status === "idle" || !config.icon) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className="fixed right-4 top-4 z-50 mt-24 flex items-center gap-2 rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-high)] px-3 py-2 shadow-sm transition-opacity duration-200">
      <Icon
        className={`size-4 ${status === "saving" ? "animate-spin" : ""} ${
          config.className
        }`}
      />
      <span className={`text-sm font-medium ${config.className}`}>
        {config.text}
      </span>
    </div>
  );
}
