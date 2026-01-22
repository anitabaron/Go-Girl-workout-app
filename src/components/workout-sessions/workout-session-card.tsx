"use client";

import React, { memo, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Play, CheckCircle2, CalendarCheck, Dumbbell, Clock10, X } from "lucide-react";
import type { SessionSummaryDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import { DeleteWorkoutSessionDialog } from "@/components/workout-sessions/delete-workout-session-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/utils/date-format";

type WorkoutSessionCardProps = {
  readonly session: SessionSummaryDTO;
};

function WorkoutSessionCardComponent({ session }: WorkoutSessionCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const isInProgress = session.status === "in_progress";
  
  const formattedStartedAt = useMemo(
    () => formatDateTime(session.started_at),
    [session.started_at]
  );

  const formattedCompletedAt = useMemo(
    () => session.completed_at ? formatDateTime(session.completed_at) : null,
    [session.completed_at]
  );

  // Oblicz aktualny czas trwania dla treningów w trakcie
  // Uwaga: czas jest aktualizowany tylko po odświeżeniu strony (używamy active_duration_seconds z serwera)
  const duration = useMemo(() => {
    if (isInProgress && !session.completed_at) {
      // Użyj active_duration_seconds, które jest aktualizowane na serwerze
      // Jeśli timer jest uruchomiony, serwer powinien już uwzględnić ten czas w active_duration_seconds
      const activeDuration = session.active_duration_seconds ?? 0;
      const currentSeconds = activeDuration;
      const currentMinutes = Math.floor(currentSeconds / 60);
      
      // Jeśli planowany czas jest dostępny, pokaż format "X min z Y min"
      const estimatedTotalTimeSeconds = session.estimated_total_time_seconds;
      if (estimatedTotalTimeSeconds !== null && estimatedTotalTimeSeconds !== undefined) {
        const plannedMinutes = Math.floor(estimatedTotalTimeSeconds / 60);
        return `${currentMinutes} min z ${plannedMinutes} min`;
      }
      
      return `${currentMinutes} min`;
    }
    
    // Dla zakończonych treningów
    if (!session.completed_at) return "W trakcie";
    
    const start = new Date(session.started_at);
    const end = new Date(session.completed_at);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }, [
    isInProgress,
    session.completed_at,
    session.started_at,
    session.active_duration_seconds,
    session.estimated_total_time_seconds
  ]);
  
  const planName = session.plan_name_at_time || "Plan usunięty";

  const exerciseCountText = useMemo(() => {
    if (!session.exercise_count || session.exercise_count === 0) return "";
    const count = session.exercise_count;
    if (count === 1) return "ćwiczenie";
    if (count < 5) return "ćwiczenia";
    return "ćwiczeń";
  }, [session.exercise_count]);

  const handleResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-sessions/${session.id}/active`);
  };

  const handleCancel = async () => {
    setIsCancelling(true);

    try {
      const response = await fetch(
        `/api/workout-sessions/${session.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 400) {
          toast.error(
            errorData.message || "Nie można anulować ukończonej sesji"
          );
        } else if (response.status === 404) {
          toast.error("Sesja treningowa nie została znaleziona");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(
            errorData.message ||
              "Wystąpił błąd serwera. Spróbuj ponownie później."
          );
        } else {
          toast.error(
            errorData.message || "Nie udało się anulować sesji treningowej"
          );
        }
        return;
      }

      toast.success("Sesja została anulowana");
      setIsCancelDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error cancelling session:", error);
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas anulowania sesji treningowej");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleted = () => {
    router.refresh();
  };

  return (
    <>
      <Card className="group relative h-full rounded-xl border border-border bg-white transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 dark:border-border dark:bg-card">
        <CardActionButtons
          onDelete={handleDeleteClick}
          editAriaLabel={`Edytuj sesję treningową: ${planName}`}
          deleteAriaLabel={`Usuń sesję treningową: ${planName}`}
          editDisabled
        />
        <Link
          href={isInProgress ? `/workout-sessions/${session.id}/active` : `/workout-sessions/${session.id}`}
          className="block h-full"
          aria-label={`Zobacz szczegóły sesji: ${planName}`}
        >
          <CardHeader>
            <div className="flex flex-col items-start gap-2">
              <CardTitle className="line-clamp-2 text-lg font-semibold flex-1">
                {planName}
              </CardTitle>
            {isInProgress ? (
              <Badge variant="default" className=" bg-destructive text-destructive-foreground">
                <Play className="mr-1 h-3 w-3" />
                W trakcie
              </Badge>
            ) : (
              <Badge variant="secondary" >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Zakończony
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span>Rozpoczęto: {formattedStartedAt}</span>
            </div>
            {formattedCompletedAt && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
               <CalendarCheck className="h-4 w-4" /> <span >Zakończono: {formattedCompletedAt}</span> 
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
             <Clock10 className="h-4 w-4" /> <span>Czas trwania: {duration}</span>
            </div>
            {session.exercise_count !== undefined && session.exercise_count > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Dumbbell className="h-4 w-4" />
                  <span className="font-medium">
                    {session.exercise_count} {exerciseCountText}
                  </span>
                </div>
                {session.exercise_names && session.exercise_names.length > 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500 ml-6">
                    {session.exercise_names.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
      {isInProgress && (
        <CardFooter className="pt-0 flex gap-3">
          <Button
            onClick={handleResume}
            variant="default"
            size="sm"
            className="flex-1"
            aria-label="Wznów trening"
          >
            <Play className="mr-2 h-4 w-4" />
            Wznów
          </Button>
          <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                aria-label="Anuluj sesję"
              >
                <X className="mr-2 h-4 w-4" />
                Anuluj sesję
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anuluj sesję treningową?</AlertDialogTitle>
                <AlertDialogDescription>
                  Czy na pewno chcesz anulować tę sesję treningową? Postęp
                  zostanie zapisany, ale sesja zostanie oznaczona jako
                  ukończona.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isCancelling}>
                  Anuluj
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isCancelling ? "Anulowanie..." : "Potwierdź"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
      </Card>

      <DeleteWorkoutSessionDialog
        sessionId={session.id}
        sessionName={planName}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </>
  );
}

// Memoizacja komponentu dla redukcji niepotrzebnych re-renderów
export const WorkoutSessionCard = memo(WorkoutSessionCardComponent);
