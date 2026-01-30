import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import {
  getWorkoutSessionService,
  listWorkoutSessionsService,
  ServiceError,
} from "@/services/workout-sessions";
import { listWorkoutPlansService } from "@/services/workout-plans";
import type { SessionDetailDTO } from "@/types";
import { EmptyState, Surface } from "../../_components";
import { ResumeSessionCardM3 } from "../../_components/ResumeSessionCardM3";
import { WorkoutPlansStartListM3 } from "../../_components/WorkoutPlansStartListM3";

export const metadata: Metadata = {
  title: "Start workout | Go Girl Workout",
  description: "Select a workout plan or resume an existing session",
};

export default async function StartWorkoutSessionPage() {
  const userId = await requireAuth();

  let inProgressSession: SessionDetailDTO | null = null;

  try {
    const sessionsResult = await listWorkoutSessionsService(userId, {
      status: "in_progress",
      limit: 1,
    });

    if (sessionsResult.items.length > 0) {
      inProgressSession = await getWorkoutSessionService(
        userId,
        sessionsResult.items[0].id,
      );
    }
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/login");
      }
    }
    console.error("Error fetching in-progress session:", error);
  }

  if (inProgressSession && inProgressSession.status === "in_progress") {
    return (
      <div className="space-y-8">
        <header>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/m3/workout-sessions"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Back to sessions
            </Link>
          </Button>
          <h1 className="m3-hero-sm mt-4">Start workout</h1>
          <p className="m3-body m3-prose mt-2 text-muted-foreground">
            Resume your active session or start a new one
          </p>
        </header>

        <Surface variant="high">
          <ResumeSessionCardM3 session={inProgressSession} />
        </Surface>
      </div>
    );
  }

  let plansResult: Awaited<ReturnType<typeof listWorkoutPlansService>> | null =
    null;

  try {
    plansResult = await listWorkoutPlansService(userId, {
      sort: "created_at",
      order: "desc",
      limit: 20,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/login");
      }
    }
    console.error("Error fetching workout plans:", error);
  }

  if (!plansResult || plansResult.items.length === 0) {
    return (
      <div className="space-y-8">
        <header>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/m3/workout-sessions"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Back to sessions
            </Link>
          </Button>
          <h1 className="m3-hero-sm mt-4">Start workout</h1>
          <p className="m3-body m3-prose mt-2 text-muted-foreground">
            Create your first workout plan to get started
          </p>
        </header>

        <Surface variant="high">
          <EmptyState
            icon={<Calendar className="size-12 text-muted-foreground" />}
            title="No workout plans"
            description="Create your first workout plan to start training"
          />
          <div className="mt-6">
            <Button
              asChild
              className="m3-cta"
              data-test-id="create-workout-plan-button"
            >
              <Link href="/m3/workout-plans/new">
                <Plus className="mr-2 size-4" />
                Create plan
              </Link>
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/m3/workout-sessions" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to sessions
          </Link>
        </Button>
        <h1 className="m3-hero-sm mt-4">Start workout</h1>
        <p className="m3-body m3-prose mt-2 text-muted-foreground">
          Select a workout plan to begin
        </p>
      </header>

      <Surface variant="high">
        <h2 className="m3-title mb-6">Select workout plan</h2>
        <WorkoutPlansStartListM3
          plans={plansResult.items}
          nextCursor={plansResult.nextCursor}
        />
      </Surface>
    </div>
  );
}
