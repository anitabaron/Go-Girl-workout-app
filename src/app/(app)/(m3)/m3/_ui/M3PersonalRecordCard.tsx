"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { DeletePersonalRecordsDialogM3 } from "../_components/DeletePersonalRecordsDialogM3";
import { PersonalRecordMetricItemM3 } from "../_components/PersonalRecordMetricItemM3";

type M3PersonalRecordCardProps = {
  readonly recordGroup: PersonalRecordGroupVM;
  readonly onDeleted?: () => void;
};

export function M3PersonalRecordCard({
  recordGroup,
  onDeleted,
}: Readonly<M3PersonalRecordCardProps>) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const hasNewRecords = recordGroup.metrics.some((metric) => metric.isNew);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleted = () => {
    onDeleted?.();
  };

  return (
    <>
      <Card className="overflow-hidden rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] transition-colors hover:border-[var(--m3-outline)]">
        <Link href={`/m3/personal-records/${recordGroup.exerciseId}`}>
          <CardHeader className="relative">
            <div className="flex items-center justify-between  ">
              <h3 className="m3-title truncate">{recordGroup.title}</h3>
              {hasNewRecords && (
                <Badge variant="default" className="shrink-0">
                  Nowy
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-3 right-2 size-8 text-muted-foreground hover:text-destructive"
              onClick={handleDeleteClick}
              aria-label={`Usuń rekordy dla: ${recordGroup.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recordGroup.metrics.length > 0 ? (
              <div>
                {recordGroup.metrics.map((metric) => (
                  <PersonalRecordMetricItemM3
                    key={`${recordGroup.exerciseId}-${metric.metricType}`}
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
        </Link>
      </Card>

      <DeletePersonalRecordsDialogM3
        exerciseId={recordGroup.exerciseId}
        exerciseTitle={recordGroup.title}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </>
  );
}
