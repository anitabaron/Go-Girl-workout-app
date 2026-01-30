import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";

type PersonalRecordMetricCardM3Props = {
  record: PersonalRecordMetricViewModel;
};

export function PersonalRecordMetricCardM3({
  record,
}: Readonly<PersonalRecordMetricCardM3Props>) {
  return (
    <Card className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)]">
      <CardHeader>
        <CardTitle className="m3-title">{record.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="m3-hero-sm text-primary">{record.valueDisplay}</p>
        <p className="m3-body text-muted-foreground text-sm">
          Osiągnięto: {record.achievedAt}
        </p>
        {record.sessionId && (
          <Link
            href={`/m3/workout-sessions/${record.sessionId}`}
            className="m3-label inline-flex items-center gap-2 text-primary hover:underline"
            aria-label="Zobacz szczegóły sesji treningowej, w której osiągnięto ten rekord"
          >
            Zobacz sesję
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
