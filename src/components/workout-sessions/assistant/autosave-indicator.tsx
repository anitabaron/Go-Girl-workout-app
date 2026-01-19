"use client";

import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { AutosaveStatus } from "@/types/workout-session-assistant";

type AutosaveIndicatorProps = {
  status: AutosaveStatus;
  errorMessage?: string;
};

/**
 * Wskaźnik statusu autosave w prawym górnym rogu ekranu.
 * Wyświetla ikonę zapisu z animacją podczas zapisywania oraz status tekstowy.
 */
export function AutosaveIndicator({
  status,
  errorMessage,
}: AutosaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: Loader2,
          text: "Zapisywanie...",
          className: "text-zinc-600 dark:text-zinc-400 ",
        };
      case "saved":
        return {
          icon: CheckCircle2,
          text: "Zapisano",
          className: "text-green-600 dark:text-green-400",
        };
      case "error":
        return {
          icon: AlertCircle,
          text: errorMessage || "Błąd zapisu",
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
    <div className="fixed right-4 top-4 z-50 mt-24 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm transition-opacity duration-200 dark:border-border dark:bg-zinc-950">
      <Icon className={`size-4 ${config.className}`} />
      <span className={`text-sm font-medium ${config.className}`}>
        {config.text}
      </span>
    </div>
  );
}
