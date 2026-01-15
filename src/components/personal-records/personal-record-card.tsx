"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { PersonalRecordGroupVM } from "@/lib/personal-records/view-model";
import { PersonalRecordMetricItem } from "./personal-record-metric-item";

type PersonalRecordCardProps = {
  recordGroup: PersonalRecordGroupVM;
};

export function PersonalRecordCard({ recordGroup }: PersonalRecordCardProps) {
  const hasNewRecords = recordGroup.metrics.some((metric) => metric.isNew);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={recordGroup.exerciseId} className="border-none">
        <AccordionTrigger className="rounded-lg border border-border bg-white px-4 py-3 hover:bg-secondary dark:border-border dark:bg-zinc-950 hover:dark:bg-zinc-900">
          <div className="flex w-full items-center justify-between pr-4">
            <div className="flex items-center gap-3">
              <h3 className="text-left font-semibold text-zinc-900 dark:text-zinc-50">
                {recordGroup.title}
              </h3>
              <Badge
                variant="secondary"
                className="bg-secondary text-destructive hover:bg-primary"
              >
                {recordGroup.type}
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
              >
                {recordGroup.part}
              </Badge>
              {hasNewRecords && (
                <Badge
                  variant="default"
                  className="bg-destructive text-destructive-foreground"
                >
                  Nowy
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pt-2">
          {recordGroup.metrics.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/50 p-4 dark:border-border dark:bg-zinc-900/50">
              {recordGroup.metrics.map((metric, index) => (
                <PersonalRecordMetricItem key={index} metric={metric} />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Brak dostępnych rekordów dla tego ćwiczenia
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
