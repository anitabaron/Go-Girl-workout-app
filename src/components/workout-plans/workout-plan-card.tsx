"use client";

import React, { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";
import type { WorkoutPlanDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EXERCISE_PART_LABELS } from "@/lib/constants";

type WorkoutPlanCardProps = {
  readonly plan: Omit<WorkoutPlanDTO, "exercises">;
  readonly exerciseCount?: number;
  readonly onDelete?: (planId: string) => Promise<void>;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function WorkoutPlanCardComponent({
  plan,
  exerciseCount,
  onDelete,
}: WorkoutPlanCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoizacja formatowania daty
  const formattedDate = useMemo(
    () => formatDate(plan.created_at),
    [plan.created_at]
  );

  const formattedUpdatedDate = useMemo(
    () => formatDate(plan.updated_at),
    [plan.updated_at]
  );

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-plans/${plan.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      if (onDelete) {
        await onDelete(plan.id);
      } else {
        const response = await fetch(`/api/workout-plans/${plan.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Plan treningowy nie został znaleziony");
          } else if (response.status === 401 || response.status === 403) {
            toast.error("Brak autoryzacji. Zaloguj się ponownie.");
            router.push("/login");
          } else if (response.status >= 500) {
            toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
          } else {
            toast.error("Nie udało się usunąć planu treningowego");
          }
          return;
        }
      }

      toast.success("Plan treningowy został usunięty");
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas usuwania planu treningowego");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="group relative h-full rounded-xl border border-border bg-secondary/70 transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              aria-label={`Edytuj plan: ${plan.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDeleteClick}
              aria-label={`Usuń plan: ${plan.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Link
          href={`/workout-plans/${plan.id}`}
          className="block h-full"
          aria-label={`Zobacz szczegóły planu: ${plan.name}`}
        >
          <CardHeader>
            <CardTitle className="line-clamp-2 text-lg font-semibold">
              {plan.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {plan.part && (
                  <Badge
                    variant="outline"
                    className="border-destructive text-destructive"
                  >
                    {EXERCISE_PART_LABELS[plan.part]}
                  </Badge>
                )}
                {exerciseCount !== undefined && (
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-destructive hover:bg-primary"
                  >
                    {exerciseCount} {exerciseCount === 1 ? "ćwiczenie" : "ćwiczeń"}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Utworzono: {formattedDate}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Zaktualizowano: {formattedUpdatedDate}
                </p>
              </div>
              {plan.description && (
                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.description}
                </p>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-dialog-description">
          <DialogHeader>
            <DialogTitle>Usuń plan treningowy</DialogTitle>
            <DialogDescription id="delete-dialog-description">
              Czy na pewno chcesz usunąć plan treningowy &quot;{plan.name}&quot;?
              Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
              disabled={isDeleting}
              aria-label="Anuluj usuwanie planu treningowego"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting}
              aria-label={`Potwierdź usunięcie planu: ${plan.name}`}
              aria-busy={isDeleting}
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Memoizacja komponentu dla redukcji niepotrzebnych re-renderów
export const WorkoutPlanCard = memo(WorkoutPlanCardComponent);
