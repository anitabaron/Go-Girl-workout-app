"use client";

import type { ExerciseType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { EXERCISE_TYPE_BADGE_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExerciseTypeLabel,
} from "@/lib/exercises/labels";

type ExerciseTypeBadgeProps = {
  readonly type: ExerciseType;
  readonly className?: string;
};

/**
 * Badge wyświetlający typ ćwiczenia (Warm-up, Main Workout, Cool-down)
 * z kolorami zgodnymi z /import-instruction:
 * - Warm-up: czerwony
 * - Main Workout: różowy
 * - Cool-down: fioletowy
 */
export function ExerciseTypeBadge({ type, className }: ExerciseTypeBadgeProps) {
  const tExerciseLabel = useTranslations(EXERCISE_LABELS_NAMESPACE);
  const badgeClasses =
    EXERCISE_TYPE_BADGE_CLASSES[type] ??
    "border-border bg-secondary text-secondary-foreground";

  return (
    <Badge variant="outline" className={cn(badgeClasses, className)}>
      {getExerciseTypeLabel(tExerciseLabel, type)}
    </Badge>
  );
}
