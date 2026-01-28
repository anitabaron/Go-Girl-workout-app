"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResetPasswordConfirmButtonProps = Readonly<{
  isLoading: boolean;
  disabled?: boolean;
}>;

/**
 * Przycisk submit formularza potwierdzenia resetu hasła z loading state.
 */
export function ResetPasswordConfirmButton({
  isLoading,
  disabled,
}: ResetPasswordConfirmButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full"
      aria-busy={isLoading}
      data-test-id="reset-password-confirm-submit-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Zapisywanie...
        </>
      ) : (
        "Zapisz nowe hasło"
      )}
    </Button>
  );
}
