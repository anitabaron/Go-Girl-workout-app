"use client";

import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";
import { PersonalRecordMetricCard } from "./personal-record-metric-card";
import { EmptyRecordsState } from "./empty-records-state";

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
    return <EmptyRecordsState />;
  }

  console.log("records", records);

  return (
    <div className="space-y-4">
      {records.map((record, index) => (
        <PersonalRecordMetricCard key={`${record.metricType}-${index}`} record={record} />
      ))}
    </div>
  );
}
