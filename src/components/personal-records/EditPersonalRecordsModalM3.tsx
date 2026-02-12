"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { EditPersonalRecordDialogM3 } from "./EditPersonalRecordDialogM3";

type EditPersonalRecordsModalM3Props = {
  readonly recordGroup: PersonalRecordGroupVM;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

export function EditPersonalRecordsModalM3({
  recordGroup,
  open,
  onOpenChange,
}: EditPersonalRecordsModalM3Props) {
  const router = useRouter();
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);

  const handleEditSaved = () => {
    setEditingMetricId(null);
    router.refresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] sm:max-w-md"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="m3-title">
              Edytuj rekordy: {recordGroup.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {recordGroup.metrics.map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between rounded-md border border-[var(--m3-outline-variant)] p-3"
              >
                <div>
                  <p className="m3-label font-medium">{metric.label}</p>
                  <p className="m3-body text-muted-foreground text-sm">
                    {metric.valueDisplay}
                    {metric.seriesValues &&
                      Object.keys(metric.seriesValues).length > 0 && (
                        <span className="ml-1">
                          ·{" "}
                          {Object.entries(metric.seriesValues)
                            .sort(
                              (a, b) =>
                                Number.parseInt(a[0].slice(1), 10) -
                                Number.parseInt(b[0].slice(1), 10),
                            )
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </span>
                      )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => setEditingMetricId(metric.id)}
                  aria-label={`Edytuj ${metric.label}`}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {recordGroup.metrics.map(
        (metric) =>
          editingMetricId === metric.id && (
            <EditPersonalRecordDialogM3
              key={metric.id}
              metric={metric}
              open={editingMetricId === metric.id}
              onOpenChange={(o) => !o && setEditingMetricId(null)}
              onSaved={handleEditSaved}
            />
          ),
      )}
    </>
  );
}
