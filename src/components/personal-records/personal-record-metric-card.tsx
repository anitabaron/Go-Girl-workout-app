"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";
import { SessionLink } from "./session-link";

type PersonalRecordMetricCardProps = {
  record: PersonalRecordMetricViewModel;
};

/**
 * Komponent wyświetlający pojedynczy rekord w formie karty.
 * Wyświetla typ metryki, wartość rekordu (sformatowaną), datę osiągnięcia
 * oraz link do sesji treningowej (jeśli dostępny).
 */
export function PersonalRecordMetricCard({
  record,
}: Readonly<PersonalRecordMetricCardProps>) {
  return (
    <Card className="rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {record.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-extrabold text-destructive">
            {record.valueDisplay}
          </p>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Osiągnięto: {record.achievedAt}
        </div>
        {record.sessionId && (
          <div>
            <SessionLink sessionId={record.sessionId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
