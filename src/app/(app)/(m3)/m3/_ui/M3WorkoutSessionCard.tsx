"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";
import {
  Calendar,
  Play,
  CheckCircle2,
  CalendarCheck,
  Dumbbell,
  Clock10,
  X,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
import type { SessionSummaryDTO } from "@/types";
import { formatDateTime } from "@/lib/utils/date-format";
import { formatSessionDuration } from "@/lib/utils/session-format";
import { toast } from "sonner";
import { useCancelSession } from "@/hooks/use-cancel-session";

type M3WorkoutSessionCardProps = {
  readonly session: SessionSummaryDTO;
};

function M3WorkoutSessionCardComponent({ session }: M3WorkoutSessionCardProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const { cancel, isCancelling } = useCancelSession(session.id);

  const isInProgress = session.status === "in_progress";

  const formattedStartedAt = useMemo(
    () => formatDateTime(session.started_at),
    [session.started_at],
  );
  const formattedCompletedAt = useMemo(
    () => (session.completed_at ? formatDateTime(session.completed_at) : null),
    [session.completed_at],
  );
  const duration = useMemo(() => formatSessionDuration(session), [session]);
  const planName = session.plan_name_at_time ?? "Plan deleted";
  const exerciseCountText = useMemo(() => {
    const count = session.exercise_count ?? 0;
    if (count === 0) return "";
    if (count === 1) return "exercise";
    return "exercises";
  }, [session.exercise_count]);

  const handleResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/workout-sessions/${session.id}/active`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        if (response.status === 404) toast.error("Session not found");
        else if (response.status === 401 || response.status === 403) {
          toast.error("Unauthorized. Please log in again.");
          router.push("/login");
        } else toast.error("Failed to delete session");
        return;
      }
      toast.success("Session deleted");
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("An error occurred while deleting the session");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelSession = async () => {
    await cancel();
    setIsCancelDialogOpen(false);
    router.refresh();
  };

  return (
    <>
      <Card className="group relative h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            aria-label={`Delete session: ${planName}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Link
          href={
            isInProgress
              ? `/workout-sessions/${session.id}/active`
              : `/m3/workout-sessions/${session.id}`
          }
          className="block h-full"
          aria-label={`View session details: ${planName}`}
        >
          <CardHeader>
            <div className="flex flex-col items-start gap-2">
              <h3 className="m3-headline line-clamp-2 pr-10">{planName}</h3>
              {isInProgress ? (
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground"
                >
                  <Play className="mr-1 size-3" />
                  In progress
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CheckCircle2 className="mr-1 size-3" />
                  Completed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span>Started: {formattedStartedAt}</span>
              </div>
              {formattedCompletedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarCheck className="size-4" />
                  <span>Completed: {formattedCompletedAt}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock10 className="size-4" />
                <span>Duration: {duration}</span>
              </div>
              {session.exercise_count != null && session.exercise_count > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-4" />
                    <span className="font-medium">
                      {session.exercise_count} {exerciseCountText}
                    </span>
                  </div>
                  {session.exercise_names &&
                    session.exercise_names.length > 0 && (
                      <div className="ml-6 text-xs text-muted-foreground">
                        {session.exercise_names.join(", ")}
                      </div>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Link>

        {isInProgress && (
          <CardFooter className="flex gap-3 pt-0">
            <Button
              onClick={handleResume}
              size="sm"
              className="m3-cta flex-1"
              aria-label="Resume workout"
            >
              <Play className="mr-2 size-4" />
              Resume
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCancelDialogOpen(true);
              }}
              aria-label="Cancel session"
            >
              <X className="mr-2 size-4" />
              Cancel session
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent aria-describedby="delete-session-description">
          <DialogHeader>
            <DialogTitle>Delete workout session</DialogTitle>
            <DialogDescription id="delete-session-description">
              Are you sure you want to delete &quot;{planName}&quot;? This
              action cannot be undone. All exercises and sets from this session
              will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel workout session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? Progress will be
              saved, but the session will be marked as completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSession}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const M3WorkoutSessionCard = memo(M3WorkoutSessionCardComponent);
