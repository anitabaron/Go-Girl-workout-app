"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Play } from "lucide-react";

type WorkoutPlanActionsProps = {
  planId: string;
  planName: string;
};

export function WorkoutPlanActions({
  planId,
  planName,
}: WorkoutPlanActionsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleEdit = () => {
    router.push(`/workout-plans/${planId}/edit`);
  };

  const handleStartWorkout = async () => {
    console.log("handleStartWorkout called, planId:", planId);
    setIsStarting(true);

    try {
      console.log("Sending POST request to /api/workout-sessions");
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workout_plan_id: planId,
        }),
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response:", errorData);
        
        if (response.status === 404) {
          toast.error("Plan treningowy nie został znaleziony");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Brak autoryzacji. Zaloguj się ponownie.");
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(
            errorData.message || "Wystąpił błąd serwera. Spróbuj ponownie później."
          );
        } else {
          toast.error(
            errorData.message || "Nie udało się rozpocząć sesji treningowej"
          );
        }
        return;
      }

      const data = await response.json();
      console.log("Success response data:", data);
      const sessionId = data.id || data.data?.id;
      console.log("Extracted sessionId:", sessionId);

      if (sessionId) {
        toast.success("Sesja treningowa została rozpoczęta");
        router.push(`/workout-sessions/${sessionId}/active`);
      } else {
        console.error("No sessionId found in response:", data);
        toast.error("Nie udało się pobrać ID sesji treningowej");
      }
    } catch (error) {
      console.error("Error in handleStartWorkout:", error);
      if (error instanceof TypeError) {
        toast.error(
          "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        toast.error("Wystąpił błąd podczas rozpoczynania sesji treningowej");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workout-plans/${planId}`, {
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

      toast.success("Plan treningowy został usunięty");
      router.push("/workout-plans");
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
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleStartWorkout}
          disabled={isStarting}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          aria-label="Rozpocznij trening z tym planem"
        >
          <Play className="mr-2 h-4 w-4" />
          {isStarting ? "Rozpoczynanie..." : "Rozpocznij trening"}
        </Button>

        <Button
          onClick={handleEdit}
          variant="outline"
          aria-label={`Edytuj plan: ${planName}`}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edytuj
        </Button>

        <Button
          onClick={() => setIsDeleteDialogOpen(true)}
          variant="outline"
          className="text-destructive hover:text-destructive"
          aria-label={`Usuń plan: ${planName}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Usuń
        </Button>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń plan treningowy</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć plan treningowy &quot;{planName}&quot;?
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
