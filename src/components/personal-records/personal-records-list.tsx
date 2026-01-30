"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { PersonalRecordsPageResponse } from "@/lib/personal-records/view-model";
import { EmptyState } from "@/components/shared/empty-state";
import { Trophy } from "lucide-react";
import { PersonalRecordCard } from "./personal-record-card";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import { mapPersonalRecordsToViewModel } from "@/lib/personal-records/view-model";

type PersonalRecordsListProps = {
  initialData: PersonalRecordsPageResponse;
  errorMessage: string | null;
};

export function PersonalRecordsList({
  initialData,
  errorMessage,
}: Readonly<PersonalRecordsListProps>) {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(initialData.items);
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset listy gdy zmieniają się filtry/sortowanie (brak kursora w URL)
  useEffect(() => {
    const currentCursor = searchParams.get("cursor");

    // Jeśli nie ma kursora w URL, resetujemy do początkowych wartości
    if (!currentCursor) {
      setRecords(initialData.items);
      setNextCursor(initialData.nextCursor);
    }
  }, [searchParams, initialData]);

  const handleLoadMore = async (cursor: string) => {
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);

      const response = await fetch(
        `/api/personal-records?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load more records");
      }

      const data = await response.json();

      // Mapowanie nowych danych do ViewModel
      const newViewModel = mapPersonalRecordsToViewModel(
        data.items,
        data.nextCursor,
      );

      // Append nowych rekordów do istniejącej listy
      startTransition(() => {
        setRecords((prev) => [...prev, ...newViewModel.items]);
        setNextCursor(newViewModel.nextCursor);
      });
    } catch (error) {
      console.error("Error loading more records:", error);
      toast.error("Nie udało się załadować więcej rekordów. Spróbuj ponownie.");
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Wyświetlanie komunikatu błędu
  if (errorMessage) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{errorMessage}</p>
      </div>
    );
  }

  // Wyświetlanie pustego stanu
  if (records.length === 0 && !isPending && !isLoadingMore) {
    return (
      <EmptyState
        icon={
          <Trophy className="h-8 w-8 text-destructive" aria-hidden="true" />
        }
        title="Nie masz jeszcze żadnych rekordów"
        description="Nie masz jeszcze żadnych rekordów. Rozpocznij trening, aby zacząć śledzić postępy!"
        actionHref="/workout-plans"
        actionLabel="Rozpocznij trening"
      />
    );
  }

  return (
    <div className="space-y-4">
      {records.map((recordGroup) => (
        <PersonalRecordCard
          key={recordGroup.exerciseId}
          recordGroup={recordGroup}
        />
      ))}

      {isLoadingMore && <SkeletonLoader count={2} variant="compact" />}

      {nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-4">
          <LoadMoreButton
            nextCursor={nextCursor}
            onLoadMore={handleLoadMore}
            ariaLabel="Załaduj więcej rekordów"
            errorMessage="Nie udało się załadować więcej rekordów. Spróbuj ponownie."
          />
        </div>
      )}
    </div>
  );
}
