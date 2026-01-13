"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SaveButtonProps = {
  isLoading: boolean;
  disabled?: boolean;
};

export function SaveButton({ isLoading, disabled }: SaveButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isLoading} className="w-full sm:w-auto">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Zapisywanie...
        </>
      ) : (
        "Zapisz"
      )}
    </Button>
  );
}
