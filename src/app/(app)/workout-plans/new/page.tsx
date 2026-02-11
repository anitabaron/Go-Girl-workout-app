import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService } from "@/services/workout-plans";
import { Surface } from "@/components";
import { WorkoutPlanFormM3 } from "@/components/WorkoutPlanFormM3";
import { getTranslations } from "@/i18n/server";

export default async function NewWorkoutPlanPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("workoutPlanNewPage");
  const userId = await requireAuth();
  const params = await searchParams;
  const duplicateId =
    typeof params.duplicate === "string" ? params.duplicate : undefined;

  let initialData: Awaited<ReturnType<typeof getWorkoutPlanService>> | undefined;
  if (duplicateId) {
    try {
      const plan = await getWorkoutPlanService(userId, duplicateId);
      initialData = {
        ...plan,
        name: `${t("copyOfPrefix")} ${plan.name}`,
      };
    } catch {
      redirect("/workout-plans");
    }
  }

  return (
    <div className="space-y-8" data-test-id="workout-plan-create-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/workout-plans" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t("backToPlans")}
            </Link>
          </Button>
          <h1 className="m3-hero-sm">
            {initialData ? t("duplicateTitle") : t("createTitle")}
          </h1>
          <p className="m3-body m3-prose text-muted-foreground">
            {initialData
              ? t("duplicateDescription")
              : t("createDescription")}
          </p>
        </div>
      </header>

      <Surface variant="high">
        <WorkoutPlanFormM3 mode="create" initialData={initialData} />
      </Surface>
    </div>
  );
}
