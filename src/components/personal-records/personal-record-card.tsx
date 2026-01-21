"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { PersonalRecordMetricItem } from "./personal-record-metric-item";
import { DeletePersonalRecordsDialog } from "./delete-personal-records-dialog";

type PersonalRecordCardProps = {
  readonly recordGroup: PersonalRecordGroupVM;
};

export function PersonalRecordCard({ recordGroup }: PersonalRecordCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const hasNewRecords = recordGroup.metrics.some((metric) => metric.isNew);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Edit functionality disabled
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleted = () => {
    router.refresh();
  };

  return (
    <>
      <div className="group relative rounded-lg border border-border bg-white dark:border-border dark:bg-zinc-950">
        <CardActionButtons
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          editDisabled={true}
          editAriaLabel={`Edytuj rekordy dla: ${recordGroup.title}`}
          deleteAriaLabel={`Usuń rekordy dla: ${recordGroup.title}`}
          positionClassName="right-2 top-2"
        />

        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {recordGroup.title}
            </h3>
            {hasNewRecords && (
              <Badge
                variant="default"
                className="bg-destructive text-destructive-foreground"
              >
                Nowy
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4">
          {recordGroup.metrics.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/50 p-4 dark:border-border dark:bg-zinc-900/50">
              {recordGroup.metrics.map((metric) => (
                <PersonalRecordMetricItem
                  key={`${recordGroup.exerciseId}-${metric.metricType}`}
                  metric={metric}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Brak dostępnych rekordów dla tego ćwiczenia
            </div>
          )}
        </div>
      </div>

      <DeletePersonalRecordsDialog
        exerciseId={recordGroup.exerciseId}
        exerciseTitle={recordGroup.title}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </>
  );
}
