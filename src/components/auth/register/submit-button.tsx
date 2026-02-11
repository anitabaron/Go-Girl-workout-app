"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type SubmitButtonProps = {
  isLoading: boolean;
  disabled: boolean;
};

/**
 * Przycisk submit formularza rejestracji z loading state i wyłączaniem podczas przetwarzania.
 */
export function SubmitButton({ isLoading, disabled }: SubmitButtonProps) {
  const t = useTranslations("auth.registerForm");
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {t("submitting")}
        </>
      ) : (
        t("submit")
      )}
    </Button>
  );
}
