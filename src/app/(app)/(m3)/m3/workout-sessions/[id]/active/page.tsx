import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import {
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import type { SessionDetailDTO } from "@/types";
import { WorkoutSessionAssistantM3 } from "../../../_components/assistant";

type WorkoutSessionActivePageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * M3 Server Component for training assistant view.
 * Fetches session data and validates that session can be used in assistant.
 */
export default async function WorkoutSessionActivePage({
  params,
}: WorkoutSessionActivePageProps) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    redirect("/m3/workout-sessions");
  }

  let session: SessionDetailDTO;

  try {
    const userId = await requireAuth();
    session = await getWorkoutSessionService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") redirect("/m3/workout-sessions");
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/m3/workout-sessions");
      }
    }
    redirect("/m3/workout-sessions");
  }

  if (session.status !== "in_progress") {
    redirect("/m3/workout-sessions");
  }

  if (!session.exercises || session.exercises.length === 0) {
    redirect("/m3/workout-sessions");
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center gap-4 px-4 py-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link
            href="/m3/workout-sessions"
            className="flex items-center gap-2"
            aria-label="Powrót do sesji"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Wstecz</span>
          </Link>
        </Button>
      </header>

      <WorkoutSessionAssistantM3
        key={id}
        sessionId={id}
        initialSession={session}
      />
    </div>
  );
}
