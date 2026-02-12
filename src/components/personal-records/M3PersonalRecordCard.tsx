"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { DeletePersonalRecordsDialogM3 } from "./DeletePersonalRecordsDialogM3";
import { EditPersonalRecordDialogM3 } from "./EditPersonalRecordDialogM3";
import { EditPersonalRecordsModalM3 } from "./EditPersonalRecordsModalM3";
import { PersonalRecordMetricItemM3 } from "./PersonalRecordMetricItemM3";
import { useTranslations } from "@/i18n/client";

type M3PersonalRecordCardProps = {
  readonly recordGroup: PersonalRecordGroupVM;
  readonly onDeleted?: () => void;
};

export function M3PersonalRecordCard({
  recordGroup,
  onDeleted,
}: Readonly<M3PersonalRecordCardProps>) {
  const t = useTranslations("m3PersonalRecordCard");
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
        className="overflow-hidden rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] transition-colors hover:border-[var(--m3-outline)] cursor-pointer gap-0 py-0"
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
        <CardHeader className="relative px-4 py-2.5 pb-0 gap-0">
          <div className="flex items-center justify-between">
            <h2 className="text-m font-semibold truncate">
              {recordGroup.title}
            </h2>
            {hasNewRecords && (
              <Badge variant="default" className="shrink-0 text-xs">
                {t("new")}
              </Badge>
            )}
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-primary"
              onClick={handleEditClick}
              aria-label={t("editAria").replace("{title}", recordGroup.title)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={handleDeleteClick}
              aria-label={t("deleteAria").replace("{title}", recordGroup.title)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2 pt-0">
          {recordGroup.metrics.length > 0 ? (
            <div>
              {recordGroup.metrics.map((metric) => (
                <PersonalRecordMetricItemM3 key={metric.id} metric={metric} />
              ))}
            </div>
          ) : (
            <p className="m3-body text-muted-foreground py-2 text-center text-xs">
              {t("emptyMetrics")}
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
