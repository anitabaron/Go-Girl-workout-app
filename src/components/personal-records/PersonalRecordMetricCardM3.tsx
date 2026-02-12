"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type {
  PersonalRecordMetricViewModel,
  SeriesValues,
} from "@/lib/personal-records/view-model";
import { EditPersonalRecordDialogM3 } from "./EditPersonalRecordDialogM3";

function formatSeriesValue(
  metricType: PersonalRecordMetricViewModel["metricType"],
  value: number,
): string {
  switch (metricType) {
    case "total_reps":
      return value.toString();
    case "max_duration":
      return `${value}s`;
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
};

export function PersonalRecordMetricCardM3({
  record,
}: Readonly<PersonalRecordMetricCardM3Props>) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <Card className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)]">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="m3-title">{record.label}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="m3-label inline-flex items-center gap-1.5 text-primary hover:underline shrink-0 h-auto py-1"
            onClick={handleEditClick}
            aria-label="Edytuj rekord w miejscu"
          >
            <Pencil className="size-4" />
            Edytuj
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="m3-hero-sm text-primary">{record.valueDisplay}</p>
          {hasSeriesValues && (
            <div className="m3-body text-muted-foreground text-sm">
              <span className="font-medium">Serie: </span>
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
                      {key} {formatted}
                    </span>
                    {index < sortedKeys.length - 1 && ", "}
                  </span>
                );
              })}
            </div>
          )}
          <p className="m3-body text-muted-foreground text-sm">
            Osiągnięto: {record.achievedAt}
          </p>
          {record.sessionId && (
            <Link
              href={`/workout-sessions/${record.sessionId}`}
              className="m3-label inline-flex items-center gap-2 text-primary hover:underline"
              aria-label="Zobacz szczegóły sesji treningowej, w której osiągnięto ten rekord"
            >
              Zobacz sesję
            </Link>
          )}
        </CardContent>
      </Card>
      <EditPersonalRecordDialogM3
        metric={record}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
