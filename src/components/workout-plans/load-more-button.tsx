"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type LoadMoreButtonProps = {
  nextCursor: string;
  onLoadMore: (cursor: string) => Promise<void>;
};

export function LoadMoreButton({ nextCursor, onLoadMore }: LoadMoreButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await onLoadMore(nextCursor);
    } catch (error) {
      console.error("Error loading more plans:", error);
      toast.error(
        "Nie udało się załadować więcej planów. Spróbuj ponownie."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLoadMore}
      disabled={isLoading}
      variant="outline"
      aria-label="Załaduj więcej planów treningowych"
    >
      {isLoading ? "Ładowanie..." : "Załaduj więcej"}
    </Button>
  );
}
