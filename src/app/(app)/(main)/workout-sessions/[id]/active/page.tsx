import { redirect } from "next/navigation";
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
    redirect("/workout-sessions");
  }

  let session: SessionDetailDTO;

  try {
    const userId = await requireAuth();
    session = await getWorkoutSessionService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") redirect("/workout-sessions");
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/workout-sessions");
      }
    }
    redirect("/workout-sessions");
  }

  if (session.status !== "in_progress") {
    redirect("/workout-sessions");
  }

  if (!session.exercises || session.exercises.length === 0) {
    redirect("/workout-sessions");
  }

  return (
    <div className="min-h-dvh flex flex-col" data-page="workout-active">
      <WorkoutSessionAssistantM3
        key={id}
        sessionId={id}
        initialSession={session}
      />
    </div>
  );
}
