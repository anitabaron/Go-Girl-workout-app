"use client";

import Link from "next/link";
import { toast } from "sonner";
import type { PersonalRecordMetricVM } from "@/lib/personal-records/view-model";
import { NewRecordBadge } from "./new-record-badge";

type PersonalRecordMetricItemProps = {
  metric: PersonalRecordMetricVM;
};

export function PersonalRecordMetricItem({
  metric,
}: PersonalRecordMetricItemProps) {
  const handleSessionLinkClick = () => {
    toast.info("Przechodzisz do sesji treningowej");
  };

  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {metric.label}:
          </span>
          <span className="text-lg font-bold text-destructive">
            {metric.valueDisplay}
          </span>
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
