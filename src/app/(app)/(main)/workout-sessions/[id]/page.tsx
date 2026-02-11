import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import {
  getWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import { getTranslations } from "@/i18n/server";
import { Surface } from "@/components";
import { WorkoutSessionDetailContent } from "@/components/WorkoutSessionDetailContent";

type WorkoutSessionDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkoutSessionDetailPage({
  params,
}: WorkoutSessionDetailPageProps) {
  const t = await getTranslations("workoutSessionDetailPage");
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    redirect("/workout-sessions");
  }

  let session;
  try {
    const userId = await requireAuth();
    session = await getWorkoutSessionService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") notFound();
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/workout-sessions");
      }
    }
    redirect("/workout-sessions");
  }

  const planName = session.plan_name_at_time ?? t("planDeletedFallback");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/workout-sessions"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              {t("backToSessions")}
            </Link>
          </Button>
          <h1 className="m3-hero-sm">{planName}</h1>
          <p className="m3-body m3-prose text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </header>

      <Surface variant="high">
        <WorkoutSessionDetailContent session={session} />
      </Surface>
    </div>
  );
}
