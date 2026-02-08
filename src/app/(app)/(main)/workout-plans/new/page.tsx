import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getWorkoutPlanService } from "@/services/workout-plans";
import { Surface } from "../../_components";
import { WorkoutPlanFormM3 } from "../../_components/WorkoutPlanFormM3";

export default async function NewWorkoutPlanPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
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
        name: `Copy of ${plan.name}`,
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
              Back to plans
            </Link>
          </Button>
          <h1 className="m3-hero-sm">
            {initialData ? "Duplicate workout plan" : "Create workout plan"}
          </h1>
          <p className="m3-body m3-prose text-muted-foreground">
            {initialData
              ? "Edit the duplicated plan and save as a new item."
              : "Create a new workout plan with exercises from your library."}
          </p>
        </div>
      </header>

      <Surface variant="high">
        <WorkoutPlanFormM3 mode="create" initialData={initialData} />
      </Surface>
    </div>
  );
}
