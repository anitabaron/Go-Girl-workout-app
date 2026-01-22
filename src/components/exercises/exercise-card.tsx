"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExerciseDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";
import { DeleteExerciseDialog } from "@/components/exercises/details/delete-exercise-dialog";

type ExerciseCardProps = {
  readonly exercise: ExerciseDTO;
};

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/exercises/${exercise.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Card className="group relative h-full rounded-xl border border-border bg-secondary/30 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card gap-3">
        <CardActionButtons
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          editAriaLabel={`Edytuj ćwiczenie: ${exercise.title}`}
          deleteAriaLabel={`Usuń ćwiczenie: ${exercise.title}`}
          positionClassName="right-2 top-2"
        />

        <Link
          href={`/exercises/${exercise.id}`}
          className="block h-full"
          aria-label={`Zobacz szczegóły ćwiczenia: ${exercise.title}`}
        >
          <CardHeader>
            <CardTitle className="line-clamp-2 text-lg font-semibold">
              {exercise.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-secondary text-destructive hover:bg-primary"
                >
                  {EXERCISE_TYPE_LABELS[exercise.type]}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-destructive text-destructive"
                >
                  {EXERCISE_PART_LABELS[exercise.part]}
                </Badge>
                {exercise.level && (
                  <Badge
                    variant="outline"
                    className="border-destructive text-destructive"
                  >
                    {exercise.level}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <span>Serie: {exercise.series}</span>
                {exercise.reps && (
                  <span className="ml-4">Powtórzenia: {exercise.reps}</span>
                )}
                {exercise.duration_seconds && (
                  <span className="ml-4">Czas: {exercise.duration_seconds} sekund</span>
                )}
              </div>
              {exercise.details && (
                <p className="text-sm font-light text-zinc-500 dark:text-zinc-500 line-clamp-2">
                  {exercise.details}
                </p>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>

      <DeleteExerciseDialog
        exerciseId={exercise.id}
        exerciseTitle={exercise.title}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}
