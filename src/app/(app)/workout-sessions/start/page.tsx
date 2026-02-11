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
import { EmptyState, Surface } from "@/components";
import { ResumeSessionCardM3 } from "@/components/ResumeSessionCardM3";
import { WorkoutPlansStartListM3 } from "@/components/WorkoutPlansStartListM3";
import { getTranslations } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Start workout | Go Girl Workout",
  description: "Select a workout plan or resume an existing session",
};

async function fetchInProgressSession(
  userId: string,
): Promise<SessionDetailDTO | null> {
  try {
    const sessionsResult = await listWorkoutSessionsService(userId, {
      status: "in_progress",
      limit: 1,
    });
    if (sessionsResult.items.length === 0) return null;
    return getWorkoutSessionService(userId, sessionsResult.items[0].id);
  } catch (error) {
    if (
      error instanceof ServiceError &&
      (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
    ) {
      redirect("/login");
    }
    console.error("Error fetching in-progress session:", error);
    return null;
  }
}

async function fetchWorkoutPlansForStart(
  userId: string,
): Promise<Awaited<ReturnType<typeof listWorkoutPlansService>> | null> {
  try {
    return listWorkoutPlansService(userId, {
      sort: "created_at",
      order: "desc",
      limit: 20,
    });
  } catch (error) {
    if (
      error instanceof ServiceError &&
      (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
    ) {
      redirect("/login");
    }
    console.error("Error fetching workout plans:", error);
    return null;
  }
}

export default async function StartWorkoutSessionPage() {
  const t = await getTranslations("startWorkoutPage");
  const userId = await requireAuth();
  const inProgressSession = await fetchInProgressSession(userId);

  if (inProgressSession?.status === "in_progress") {
    return (
      <div className="space-y-8">
        <header>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/workout-sessions"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              {t("backToSessions")}
            </Link>
          </Button>
          <h1 className="m3-hero-sm mt-4">{t("title")}</h1>
          <p className="m3-body m3-prose mt-2 text-muted-foreground">
            {t("resumeOrStartDescription")}
          </p>
        </header>

        <Surface variant="high">
          <ResumeSessionCardM3 session={inProgressSession} />
        </Surface>
      </div>
    );
  }

  const plansResult = await fetchWorkoutPlansForStart(userId);

  if (!plansResult?.items.length) {
    return (
      <div className="space-y-8">
        <header>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/workout-sessions"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              {t("backToSessions")}
            </Link>
          </Button>
          <h1 className="m3-hero-sm mt-4">{t("title")}</h1>
          <p className="m3-body m3-prose mt-2 text-muted-foreground">
            {t("createFirstPlanDescription")}
          </p>
        </header>

        <Surface variant="high">
          <EmptyState
            icon={<Calendar className="size-12 text-muted-foreground" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
          <div className="mt-6">
            <Button
              asChild
              className="m3-cta"
              data-test-id="create-workout-plan-button"
            >
              <Link href="/workout-plans/new">
                <Plus className="mr-2 size-4" />
                {t("createPlanCta")}
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
          <Link href="/workout-sessions" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            {t("backToSessions")}
          </Link>
        </Button>
        <h1 className="m3-hero-sm mt-4">{t("title")}</h1>
        <p className="m3-body m3-prose mt-2 text-muted-foreground">
          {t("selectPlanDescription")}
        </p>
      </header>

      <Surface variant="high">
        <h2 className="m3-title mb-6">{t("selectPlanHeading")}</h2>
        <WorkoutPlansStartListM3
          plans={plansResult.items}
          nextCursor={plansResult.nextCursor}
        />
      </Surface>
    </div>
  );
}
