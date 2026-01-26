"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveButtonProps } from "@/types/workout-plan-form";

export function SaveButton({ isLoading, disabled }: Readonly<SaveButtonProps>) {
  return (
    <Button
      type="submit"
      disabled={disabled || isLoading}
      className="min-w-[120px]"
      data-test-id="workout-plan-form-save-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Zapisywanie...
        </>
      ) : (
        "Zapisz"
      )}
    </Button>
  );
}
