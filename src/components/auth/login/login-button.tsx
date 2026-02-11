"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type LoginButtonProps = {
  isLoading: boolean;
  disabled?: boolean;
};

export function LoginButton({ isLoading, disabled }: LoginButtonProps) {
  const t = useTranslations("auth.loginForm");
  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full"
      aria-busy={isLoading}
      data-test-id="login-submit-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("submitting")}
        </>
      ) : (
        t("submit")
      )}
    </Button>
  );
}
