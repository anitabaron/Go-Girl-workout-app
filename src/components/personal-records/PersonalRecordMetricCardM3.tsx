"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotebookText, Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "@/i18n/client";
import type {
  PersonalRecordMetricViewModel,
  SeriesValues,
} from "@/lib/personal-records/view-model";
import { formatCompactSeconds } from "@/lib/utils/time-format";
import { EditPersonalRecordDialogM3 } from "./EditPersonalRecordDialogM3";
import { DeletePersonalRecordsDialogM3 } from "./DeletePersonalRecordsDialogM3";

function formatSeriesValue(
  metricType: PersonalRecordMetricViewModel["metricType"],
  value: number,
): string {
  switch (metricType) {
    case "total_reps":
      return value.toString();
    case "max_duration":
      return formatCompactSeconds(value);
    case "max_weight":
      return `${value} kg`;
    default:
      return value.toString();
  }
}

function getExceptionalSetKeys(seriesValues: SeriesValues): Set<string> {
  const keys = Object.keys(seriesValues);
  if (keys.length === 0) return new Set<string>();
  const maxValue = Math.max(...keys.map((k) => seriesValues[k] ?? 0));
  const exceptional = new Set<string>();
  for (const key of keys) {
    if ((seriesValues[key] ?? 0) === maxValue) exceptional.add(key);
  }
  return exceptional;
}

function getSortedSeriesKeys(seriesValues: SeriesValues): string[] {
  return Object.keys(seriesValues).sort(
    (a, b) => Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10),
  );
}

type PersonalRecordMetricCardM3Props = {
  record: PersonalRecordMetricViewModel;
  exerciseId: string;
  exerciseTitle: string;
};

export function PersonalRecordMetricCardM3({
  record,
  exerciseId,
  exerciseTitle,
}: Readonly<PersonalRecordMetricCardM3Props>) {
  const t = useTranslations("personalRecordMetricCard");
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const hasSeriesValues =
    record.seriesValues && Object.keys(record.seriesValues).length > 0;
  const sortedKeys = hasSeriesValues
    ? getSortedSeriesKeys(record.seriesValues!)
    : [];
  const exceptionalKeys = hasSeriesValues
    ? getExceptionalSetKeys(record.seriesValues!)
    : new Set<string>();

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };
  const handleViewSessionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!record.sessionId) return;
    router.push(`/workout-sessions/${record.sessionId}`);
  };
  const iconButtonClass =
    "size-7 rounded-full text-muted-foreground hover:bg-[var(--m3-surface-container-high)] hover:text-foreground";

  return (
    <>
      <Card className="gap-4 rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] py-0">
        <CardHeader className="relative px-6 py-6 pb-0 pr-24">
          <CardTitle className="m3-title">{record.label}</CardTitle>
          <div className="absolute top-4 right-4 flex items-center gap-0.5">
            {record.sessionId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconButtonClass}
                    onClick={handleViewSessionClick}
                    aria-label={t("viewSessionAria")}
                  >
                    <NotebookText className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("viewSession")}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClass}
                  onClick={handleEditClick}
                  aria-label={t("editAria")}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("edit")}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClass}
                  onClick={handleDeleteClick}
                  aria-label={t("deleteAria")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("delete")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <p className="text-4xl font-semibold leading-none text-primary sm:text-5xl">
            {record.valueDisplay}
          </p>
          {hasSeriesValues && (
            <div className="m3-body text-muted-foreground text-sm">
              <span className="m3-label text-sm font-semibold">
                {t("series")}
              </span>{" "}
              {sortedKeys.map((key, index) => {
                const value = record.seriesValues![key] ?? 0;
                const formatted = formatSeriesValue(record.metricType, value);
                const isExceptional = exceptionalKeys.has(key);
                return (
                  <span key={key}>
                    <span
                      className={
                        isExceptional
                          ? "font-semibold text-[var(--m3-primary)]"
                          : ""
                      }
                    >
                      {formatted}
                    </span>
                    {index < sortedKeys.length - 1 && ", "}
                  </span>
                );
              })}
            </div>
          )}
          <p className="m3-body text-muted-foreground text-sm">
            {t("achievedAt")} {record.achievedAt}
          </p>
        </CardContent>
      </Card>
      <EditPersonalRecordDialogM3
        metric={record}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <DeletePersonalRecordsDialogM3
        exerciseId={exerciseId}
        exerciseTitle={exerciseTitle}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}
