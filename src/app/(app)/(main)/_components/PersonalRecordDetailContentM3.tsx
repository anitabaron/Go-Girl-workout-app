"use client";

import { Trophy } from "lucide-react";
import type { PersonalRecordMetricViewModel } from "@/lib/personal-records/view-model";
import { useTranslations } from "@/i18n/client";
import { EmptyState } from "./EmptyState";
import { PersonalRecordMetricCardM3 } from "./PersonalRecordMetricCardM3";

type PersonalRecordDetailContentM3Props = {
  records: PersonalRecordMetricViewModel[];
};

export function PersonalRecordDetailContentM3({
  records,
}: Readonly<PersonalRecordDetailContentM3Props>) {
  const t = useTranslations("personalRecordDetail");

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="size-12 text-muted-foreground" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        actionHref="/workout-plans"
        actionLabel={t("emptyAction")}
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
