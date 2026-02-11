import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/db/supabase.server";
import { getExerciseRelations } from "@/repositories/exercises";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { getTranslations } from "@/i18n/server";
import { ExerciseDetailContent, PageHeader, Surface } from "@/components";

export default async function ExerciseDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const t = await getTranslations("exerciseDetailPage");
  const { id } = await params;
  const userId = await requireAuth();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    redirect("/exercises");
  }

  let exercise;
  let relationsData: {
    plansCount: number;
    sessionsCount: number;
    hasRelations: boolean;
  };

  try {
    exercise = await getExerciseService(userId, id);
    const supabase = await createClient();
    relationsData = await getExerciseRelations(supabase, id);
  } catch {
    redirect("/exercises");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={exercise.title}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/exercises">
              <ArrowLeft className="mr-2 size-4" />
              {t("backToList")}
            </Link>
          </Button>
        }
      />

      <Surface variant="high">
        <ExerciseDetailContent
          exercise={exercise}
          relationsData={relationsData}
        />
      </Surface>
    </div>
  );
}
