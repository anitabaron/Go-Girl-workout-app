"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { PersonalRecordsPageResponse } from "@/lib/personal-records/view-model";
import { mapPersonalRecordsToViewModel } from "@/lib/personal-records/view-model";
import { EmptyState } from "./EmptyState";
import { Trophy } from "lucide-react";
import { M3PersonalRecordCard } from "./M3PersonalRecordCard";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

type PersonalRecordsListM3Props = {
  initialData: PersonalRecordsPageResponse;
  errorMessage: string | null;
};

export function PersonalRecordsListM3({
  initialData,
  errorMessage,
}: Readonly<PersonalRecordsListM3Props>) {
  const t = useTranslations("personalRecordsList");
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(initialData.items);
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!searchParams.get("cursor")) {
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
        throw new Error(t("loadMoreError"));
      }

      const data = await response.json();

      const newViewModel = mapPersonalRecordsToViewModel(
        data.items,
        data.nextCursor,
      );

      startTransition(() => {
        setRecords((prev) => [...prev, ...newViewModel.items]);
        setNextCursor(newViewModel.nextCursor);
      });
    } catch (error) {
      console.error("Error loading more:", error);
      toast.error(t("loadMoreToast"));
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDeleted = (exerciseId: string) => {
    startTransition(() => {
      setRecords((prev) => prev.filter((r) => r.exerciseId !== exerciseId));
    });
  };

  if (errorMessage) {
    return (
      <div className="py-8 text-center">
        <p className="m3-body text-destructive">{errorMessage}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="size-12 text-muted-foreground" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        actionHref="/workout-plans"
        actionLabel={t("emptyAction")}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        {records.map((recordGroup) => (
          <M3PersonalRecordCard
            key={recordGroup.exerciseId}
            recordGroup={recordGroup}
            onDeleted={() => handleDeleted(recordGroup.exerciseId)}
          />
        ))}
      </div>
      {nextCursor && !isLoadingMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            onClick={() => handleLoadMore(nextCursor)}
            disabled={isLoadingMore}
            aria-label={t("loadMoreAria")}
          >
            {isLoadingMore ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
