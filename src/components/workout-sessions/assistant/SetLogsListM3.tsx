"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetLogItemM3 } from "./SetLogItemM3";
import type { SetLogFormData } from "@/types/workout-session-assistant";
import { useTranslations } from "@/i18n/client";

type SetLogsListM3Props = {
  sets: SetLogFormData[];
  onAdd: () => void;
  onUpdate: (index: number, set: SetLogFormData) => void;
  onRemove: (index: number) => void;
  errors?: Record<number, string>;
  showDuration?: boolean;
  showReps?: boolean;
  isSkipped?: boolean;
};

export function SetLogsListM3({
  sets,
  onAdd,
  onUpdate,
  onRemove,
  errors,
  showDuration,
  showReps,
  isSkipped = false,
}: Readonly<SetLogsListM3Props>) {
  const t = useTranslations("assistantSetLog");

  return (
    <div
      className={`space-y-4 ${
        isSkipped ? "pointer-events-none opacity-50 grayscale" : ""
      }`}
    >
      {sets.length === 0 ? (
        <div className="rounded-[var(--m3-radius-lg)] border border-dashed border-[var(--m3-outline-variant)] p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set, index) => (
            <SetLogItemM3
              key={`set-${set.set_number}-${index}`}
              set={set}
              onChange={(updatedSet) => onUpdate(index, updatedSet)}
              onRemove={() => onRemove(index)}
              error={errors?.[index]}
              showDuration={showDuration}
              showReps={showReps}
              isSkipped={isSkipped}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={isSkipped}
          aria-label={t("addSetAria")}
        >
          <Plus className="size-4" />
          <span className="ml-2">{t("addSet")}</span>
        </Button>
      </div>
    </div>
  );
}
