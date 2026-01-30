"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type LoadMoreButtonProps = {
  nextCursor: string;
  onLoadMore: (cursor: string) => Promise<void>;
  /** Aria-label for accessibility (e.g. "Załaduj więcej planów treningowych") */
  ariaLabel: string;
  /** Toast error message on load failure (e.g. "Nie udało się załadować więcej planów. Spróbuj ponownie.") */
  errorMessage: string;
};

export function LoadMoreButton({
  nextCursor,
  onLoadMore,
  ariaLabel,
  errorMessage,
}: Readonly<LoadMoreButtonProps>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await onLoadMore(nextCursor);
    } catch (error) {
      console.error("Error loading more:", error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLoadMore}
      disabled={isLoading}
      variant="outline"
      aria-label={ariaLabel}
    >
      {isLoading ? "Ładowanie..." : "Załaduj więcej"}
    </Button>
  );
}
