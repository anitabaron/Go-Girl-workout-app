import { useEffect } from "react";

/**
 * Hook do obsługi potwierdzenia przed opuszczeniem strony z niezapisanymi zmianami.
 * Wyświetla natywny dialog przeglądarki, gdy użytkownik próbuje opuścić stronę.
 */
export function useBeforeUnload(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Większość przeglądarek ignoruje custom message, ale ustawiamy domyślny
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}
