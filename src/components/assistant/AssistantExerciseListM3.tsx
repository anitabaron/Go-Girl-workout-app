"use client";

import type { SessionExerciseDTO } from "@/types";
import {
  formatDuration,
} from "@/lib/utils/time-format";
import { useTranslations } from "@/i18n/client";

export type AssistantExerciseListM3Props = {
  readonly exercises: SessionExerciseDTO[];
  readonly currentExerciseIndex: number;
};

/**
 * Compact list of exercises in the session (Exercise, Reps/time, Sets, Rest)
 * with the currently active exercise highlighted. Shown at the bottom of the workout assistant.
 */
export function AssistantExerciseListM3({
  exercises,
  currentExerciseIndex,
}: Readonly<AssistantExerciseListM3Props>) {
  const t = useTranslations("assistantExerciseList");

  if (!exercises.length) return null;

  return (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-xs text-muted-foreground">
          <thead>
            <tr className="border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] text-foreground">
              <th className="w-5 py-1.5 pr-1 text-left" aria-hidden="true" />
              <th className="py-1.5 pr-3 text-left font-medium">{t("exercise")}</th>
              <th className="py-1.5 pr-3 text-left font-medium">
                {t("repsTime")}
              </th>
              <th className="py-1.5 pr-3 text-left font-medium">{t("sets")}</th>
              <th className="py-1.5 text-left font-medium">{t("rest")}</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => {
              const isCurrent = i === currentExerciseIndex;
              const title =
                ex.exercise_title_at_time ?? `${t("exercise")} ${i + 1}`;
              const repsOrDuration =
                ex.planned_reps != null && ex.planned_reps > 0
                  ? `${ex.planned_reps} ${t("repsUnit")}`
                  : ex.planned_duration_seconds != null &&
                      ex.planned_duration_seconds > 0
                    ? formatDuration(ex.planned_duration_seconds)
                    : "-";
              const sets =
                ex.planned_sets != null && ex.planned_sets > 0
                  ? `${ex.planned_sets}`
                  : "-";
              const rest =
                ex.planned_rest_seconds != null && ex.planned_rest_seconds > 0
                  ? formatDuration(ex.planned_rest_seconds)
                  : "-";

              return (
                <tr
                  key={ex.id}
                  className={`border-b border-[var(--m3-outline-variant)] last:border-0 ${
                    isCurrent
                      ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
                      : ""
                  }`}
                >
                  <td className="w-5 py-1.5 pr-1 align-middle">
                    {isCurrent ? (
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full bg-[var(--m3-primary)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="inline-block size-2.5 shrink-0" />
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-medium">{title}</td>
                  <td className="py-1.5 pr-3">{repsOrDuration}</td>
                  <td className="py-1.5 pr-3">{sets}</td>
                  <td className="py-1.5">{rest}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}
