"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { DeletePersonalRecordsDialogM3 } from "../_components/DeletePersonalRecordsDialogM3";
import { EditPersonalRecordDialogM3 } from "../_components/EditPersonalRecordDialogM3";
import { EditPersonalRecordsModalM3 } from "../_components/EditPersonalRecordsModalM3";
import { PersonalRecordMetricItemM3 } from "../_components/PersonalRecordMetricItemM3";

type M3PersonalRecordCardProps = {
  readonly recordGroup: PersonalRecordGroupVM;
  readonly onDeleted?: () => void;
};

export function M3PersonalRecordCard({
  recordGroup,
  onDeleted,
}: Readonly<M3PersonalRecordCardProps>) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [directEditMetricId, setDirectEditMetricId] = useState<string | null>(
    null,
  );
  const hasNewRecords = recordGroup.metrics.some((metric) => metric.isNew);

  const handleCardClick = () => {
    router.push(`/personal-records/${recordGroup.exerciseId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (recordGroup.metrics.length === 1) {
      setDirectEditMetricId(recordGroup.metrics[0]!.id);
    } else {
      setIsEditModalOpen(true);
    }
  };

  const singleMetric = recordGroup.metrics[0];

  const handleDeleted = () => {
    onDeleted?.();
  };

  return (
    <>
      <Card
        className="overflow-hidden rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] transition-colors hover:border-[var(--m3-outline)] cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <CardHeader className="relative">
          <div className="flex items-center justify-between  ">
            <h3 className="m3-title truncate">{recordGroup.title}</h3>
            {hasNewRecords && (
              <Badge variant="default" className="shrink-0">
                Nowy
              </Badge>
            )}
          </div>

          <div className="absolute -top-3 right-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-primary"
              onClick={handleEditClick}
              aria-label={`Edytuj rekordy dla: ${recordGroup.title}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={handleDeleteClick}
              aria-label={`Usuń rekordy dla: ${recordGroup.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recordGroup.metrics.length > 0 ? (
            <div>
              {recordGroup.metrics.map((metric) => (
                <PersonalRecordMetricItemM3
                  key={metric.id}
                  metric={metric}
                />
              ))}
            </div>
          ) : (
            <p className="m3-body text-muted-foreground py-4 text-center text-sm">
              Brak dostępnych rekordów dla tego ćwiczenia
            </p>
          )}
        </CardContent>
      </Card>

      <DeletePersonalRecordsDialogM3
        exerciseId={recordGroup.exerciseId}
        exerciseTitle={recordGroup.title}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
      />

      {singleMetric && (
        <EditPersonalRecordDialogM3
          metric={singleMetric}
          open={directEditMetricId === singleMetric.id}
          onOpenChange={(o) => !o && setDirectEditMetricId(null)}
        />
      )}
      {recordGroup.metrics.length > 1 && (
        <EditPersonalRecordsModalM3
          recordGroup={recordGroup}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
    </>
  );
}
