import { Trophy } from "lucide-react";
import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";
import { EmptyState } from "./EmptyState";
import { PersonalRecordMetricCardM3 } from "./PersonalRecordMetricCardM3";

type PersonalRecordDetailContentM3Props = {
  records: PersonalRecordMetricViewModel[];
};

export function PersonalRecordDetailContentM3({
  records,
}: Readonly<PersonalRecordDetailContentM3Props>) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="size-12 text-muted-foreground" />}
        title="Brak rekordów dla tego ćwiczenia"
        description="Nie masz jeszcze żadnych rekordów dla tego ćwiczenia. Rozpocznij trening, aby ustanowić pierwszy rekord!"
        actionHref="/workout-plans"
        actionLabel="Rozpocznij trening"
      />
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <PersonalRecordMetricCardM3 key={record.id} record={record} />
      ))}
    </div>
  );
}
