"use client";

import { useRouter, usePathname } from "next/navigation";
import { setDesignMode, type DesignMode } from "@/app/actions/design-mode";

/**
 * Przełącznik między designem Legacy a M3.
 * Ustawia cookie i przekierowuje na odpowiednią wersję bieżącej strony.
 *
 * currentMode musi być przekazany z layoutu, bo przy rewrite URL się nie zmienia.
 */
export function DesignModeToggle({
  currentMode,
}: Readonly<{ currentMode: DesignMode }>) {
  const router = useRouter();
  const pathname = usePathname();

  const handleToggle = async () => {
    const newMode: DesignMode = currentMode === "m3" ? "legacy" : "m3";
    await setDesignMode(newMode);

    if (currentMode === "m3") {
      const legacyPath = pathname.replace(/^\/m3/, "") || "/";
      router.push(legacyPath);
    } else {
      const m3Path = pathname === "/" ? "/m3" : `/m3${pathname}`;
      router.push(m3Path);
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={
        currentMode === "m3"
          ? "Przełącz na design Legacy"
          : "Przełącz na design M3"
      }
    >
      {currentMode === "m3" ? "Legacy" : "M3"}
    </button>
  );
}
