"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type LoadMoreButtonProps = {
  nextCursor: string;
};

export function LoadMoreButton({ nextCursor }: LoadMoreButtonProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", nextCursor);
      router.push(`${pathname}?${params.toString()}`);
    } catch (error) {
      console.error("Error loading more plans:", error);
      // TODO: Wyświetlenie toast notification z komunikatem błędu
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
