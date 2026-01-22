"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetLogItem } from "./set-log-item";
import type { SetLogFormData } from "@/types/workout-session-assistant";

type SetLogsListProps = {
  sets: SetLogFormData[];
  onAdd: () => void;
  onUpdate: (index: number, set: SetLogFormData) => void;
  onRemove: (index: number) => void;
  errors?: Record<number, string>; // klucz: index serii, wartość: komunikat błędu
  showDuration?: boolean; // czy pokazać pole czasu trwania
  showReps?: boolean; // czy pokazać pole powtórzeń
  isSkipped?: boolean; // czy ćwiczenie jest pominięte
};

/**
 * Komponent wyświetlający listę serii ćwiczenia z możliwością dodawania, edycji i usuwania.
 */
export function SetLogsList({
  sets,
  onAdd,
  onUpdate,
  onRemove,
  errors,
  showDuration,
  showReps,
  isSkipped = false,
}: Readonly<SetLogsListProps>) {
  return (
    <div className={`space-y-4 ${isSkipped ? "opacity-50 grayscale pointer-events-none" : ""}`}>
      {sets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Brak serii. Kliknij &quot;Dodaj serię&quot;, aby dodać pierwszą serię.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set, index) => (
            <SetLogItem
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
          aria-label="Dodaj nową serię"
        >
          <Plus className="size-4" />
          <span className="ml-2">Dodaj serię</span>
        </Button>
      </div>
    </div>
  );
}
