"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Play, X } from "lucide-react";

import type { SessionDetailDTO } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type ResumeSessionCardProps = {
  session: SessionDetailDTO;
};

/**
 * Client Component wyświetlający kartę z informacją o istniejącej sesji in_progress.
 * Zawiera szczegóły sesji oraz przyciski do wznowienia lub anulowania sesji.
 */
export function ResumeSessionCard({ session }: ResumeSessionCardProps) {
  const router = useRouter();
  const [isResuming, setIsResuming] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Oblicz postęp sesji
  const totalExercises = session.exercises.length;
  const currentExerciseNumber = Math.max(1, session.current_position ?? 0);
  const progressPercentage =
    totalExercises > 0
      ? Math.round((currentExerciseNumber / totalExercises) * 100)
      : 0;

  // Formatuj datę rozpoczęcia
  const startedAtDate = new Date(session.started_at);
  const formattedDate = startedAtDate.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleResume = async () => {
    setIsResuming(true);

    try {
      // Przekieruj bezpośrednio do asystenta sesji
      router.push(`/workout-sessions/${session.id}/active`);
    } catch (error) {
      console.error("Error resuming session:", error);
      toast.error("Nie udało się wznowić sesji treningowej");
    } finally {
      setIsResuming(false);
    }
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
      // Odśwież stronę, aby wyświetlić listę planów
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

  return (
    <>
      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aktywna sesja treningowa
          </CardTitle>
          <CardDescription>
            Masz rozpoczętą sesję treningową, którą możesz wznowić
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Plan treningowy
            </p>
            <p className="text-lg font-semibold">{session.plan_name_at_time}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Rozpoczęto
            </p>
            <p className="text-base">{formattedDate}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Postęp
            </p>
            <p className="text-base">
              Ćwiczenie {currentExerciseNumber} z {totalExercises} (
              {progressPercentage}%)
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleResume}
            disabled={isResuming}
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
            aria-label="Wznów trening"
          >
            {isResuming ? (
              <>
                <span className="mr-2">Wznawianie...</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Wznów trening
              </>
            )}
          </Button>
          <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
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
      </Card>
    </>
  );
}
