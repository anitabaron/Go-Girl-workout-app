"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type {
  PersonalRecordMetricVM,
  SeriesValues,
} from "@/lib/personal-records/view-model";

type PersonalRecordMetricItemM3Props = {
  metric: PersonalRecordMetricVM;
};

function formatSeriesValue(
  metricType: PersonalRecordMetricVM["metricType"],
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

export function PersonalRecordMetricItemM3({
  metric,
}: Readonly<PersonalRecordMetricItemM3Props>) {
  const hasSeriesValues =
    metric.seriesValues && Object.keys(metric.seriesValues).length > 0;

  const exceptionalKeys = hasSeriesValues
    ? getExceptionalSetKeys(metric.seriesValues!)
    : new Set<string>();

  const sortedKeys = hasSeriesValues
    ? getSortedSeriesKeys(metric.seriesValues!)
    : [];

  return (
    <div className="flex items-center justify-between border-b border-[var(--m3-outline-variant)] py-0.5 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="m3-label text-xs font-semibold">{metric.label}:</span>
          <span className="m3-title text-sm font-semibold text-primary">{metric.valueDisplay}</span>
          {hasSeriesValues && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="m3-body text-muted-foreground text-xs">
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
                            ? "font-semibold text-[var(--m3-primary)]"
                            : ""
                        }
                      >
                        {formatted}
                      </span>
                      {index < sortedKeys.length - 1 ? ", " : ""}
                    </span>
                  );
                })}
              </span>
            </>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground text-xs">
            {metric.achievedAt}
          </span>
          {metric.isNew && (
            <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">
              Nowy
            </Badge>
          )}
        </div>
      </div>
      {metric.sessionId && (
        <Link
          href={`/workout-sessions/${metric.sessionId}`}
          className="ml-2 shrink-0 m3-label text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded text-xs"
          aria-label="Zobacz szczegóły sesji treningowej, w której osiągnięto ten rekord"
          onClick={(e) => e.stopPropagation()}
        >
          Zobacz sesję
        </Link>
      )}
    </div>
  );
}
