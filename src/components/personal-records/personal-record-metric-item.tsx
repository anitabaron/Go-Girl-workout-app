"use client";

import Link from "next/link";
import { toast } from "sonner";
import type {
  PersonalRecordMetricVM,
  SeriesValues,
} from "@/lib/personal-records/view-model";
import { NewRecordBadge } from "./new-record-badge";

type PersonalRecordMetricItemProps = {
  metric: PersonalRecordMetricVM;
};

function formatSeriesValue(
  metricType: PersonalRecordMetricVM["metricType"],
  value: number,
): string {
  switch (metricType) {
    case "total_reps":
      return value.toString();
    case "max_duration": {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    case "max_weight":
      return `${value} kg`;
    default:
      return value.toString();
  }
}

/** Zwraca klucze serii o najwyższej wartości (np. S2 gdy S1:5, S2:20, S3:5) */
function getExceptionalSetKeys(seriesValues: SeriesValues): Set<string> {
  const keys = Object.keys(seriesValues);
  if (keys.length === 0) return new Set<string>();

  const maxValue = Math.max(...keys.map((k) => seriesValues[k] ?? 0));
  const exceptional = new Set<string>();

  for (const key of keys) {
    if ((seriesValues[key] ?? 0) === maxValue) {
      exceptional.add(key);
    }
  }

  return exceptional;
}

function getSortedSeriesKeys(seriesValues: SeriesValues): string[] {
  return Object.keys(seriesValues).sort(
    (a, b) => Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10),
  );
}

export function PersonalRecordMetricItem({
  metric,
}: Readonly<PersonalRecordMetricItemProps>) {
  const handleSessionLinkClick = () => {
    toast.info("Przechodzisz do sesji treningowej");
  };

  const hasSeriesValues =
    metric.seriesValues && Object.keys(metric.seriesValues).length > 0;

  const exceptionalKeys = hasSeriesValues
    ? getExceptionalSetKeys(metric.seriesValues!)
    : new Set<string>();

  const sortedKeys = hasSeriesValues
    ? getSortedSeriesKeys(metric.seriesValues!)
    : [];

  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {metric.label}:
          </span>
          <span className="text-lg font-bold text-destructive">
            {metric.valueDisplay}
          </span>
          {hasSeriesValues && (
            <>
              <span className="text-zinc-500 dark:text-zinc-400">·</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                serie{" "}
                {sortedKeys.map((key, index) => {
                  const value = metric.seriesValues![key] ?? 0;
                  const formatted = formatSeriesValue(metric.metricType, value);
                  const isExceptional = exceptionalKeys.has(key);

                  return (
                    <span key={key}>
                      <span
                        className={
                          isExceptional
                            ? "font-semibold text-amber-600 dark:text-amber-500"
                            : ""
                        }
                      >
                        {formatted}
                      </span>
                      {index < sortedKeys.length - 1 && ", "}
                    </span>
                  );
                })}
              </span>
            </>
          )}
          {metric.isNew && <NewRecordBadge />}
        </div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Osiągnięto: {metric.achievedAt}
        </div>
      </div>
      {metric.sessionId && (
        <Link
          href={`/workout-sessions/${metric.sessionId}`}
          onClick={handleSessionLinkClick}
          className="ml-4 text-sm font-medium text-destructive hover:underline focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded"
          aria-label={`Zobacz szczegóły sesji treningowej, w której osiągnięto ten rekord`}
        >
          Zobacz sesję
        </Link>
      )}
    </div>
  );
}
