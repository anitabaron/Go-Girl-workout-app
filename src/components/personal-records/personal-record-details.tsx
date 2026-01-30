"use client";

import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";
import { EmptyState } from "@/components/shared/empty-state";
import { Trophy } from "lucide-react";
import { PersonalRecordMetricCard } from "./personal-record-metric-card";

type PersonalRecordDetailsProps = {
  records: PersonalRecordMetricViewModel[];
};

/**
 * Komponent wyświetlający szczegóły wszystkich rekordów dla ćwiczenia.
 * Grupuje rekordy według typu metryki i wyświetla każdy rekord w osobnej karcie.
 * Jeśli brak rekordów, wyświetla pusty stan.
 */
export function PersonalRecordDetails({
  records,
}: Readonly<PersonalRecordDetailsProps>) {
  // Obsługa pustego stanu
  if (records.length === 0) {
    return (
      <EmptyState
        icon={
          <Trophy className="h-8 w-8 text-destructive" aria-hidden="true" />
        }
        title="Brak rekordów dla tego ćwiczenia"
        description="Nie masz jeszcze żadnych rekordów dla tego ćwiczenia. Rozpocznij trening, aby ustanowić pierwszy rekord!"
        actionHref="/workout-plans"
        actionLabel="Rozpocznij trening"
      />
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record, index) => (
        <PersonalRecordMetricCard
          key={`${record.metricType}-${index}`}
          record={record}
        />
      ))}
    </div>
  );
}
