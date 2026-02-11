import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService, ServiceError } from "@/services/workout-plans";
import { getTranslations } from "@/i18n/server";
import { Surface, WorkoutPlanDetailContent } from "@/components";

type WorkoutPlanDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WorkoutPlanDetailPage({
  params,
}: WorkoutPlanDetailPageProps) {
  const t = await getTranslations("workoutPlanDetailPage");
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    redirect("/workout-plans");
  }

  let workoutPlan;
  try {
    const userId = await requireAuth();
    workoutPlan = await getWorkoutPlanService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError) {
      if (error.code === "NOT_FOUND") notFound();
      if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
        redirect("/workout-plans");
      }
    }
    redirect("/workout-plans");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/workout-plans" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t("backToPlans")}
            </Link>
          </Button>
          <h1 className="m3-hero-sm">{t("title")}</h1>
          <p className="m3-body m3-prose text-muted-foreground">
            {workoutPlan.name}
          </p>
        </div>
      </header>

      <Surface variant="high">
        <WorkoutPlanDetailContent plan={workoutPlan} />
      </Surface>
    </div>
  );
}
