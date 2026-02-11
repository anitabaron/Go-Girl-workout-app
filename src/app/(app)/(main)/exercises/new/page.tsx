import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { getTranslations } from "@/i18n/server";
import { ExerciseFormM3, PageHeader, Surface } from "@/components";

export default async function NewExercisePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const t = await getTranslations("exerciseNewPage");
  const userId = await requireAuth();
  const params = await searchParams;
  const duplicateId =
    typeof params.duplicate === "string" ? params.duplicate : undefined;

  let initialData: Awaited<ReturnType<typeof getExerciseService>> | undefined;
  if (duplicateId) {
    try {
      const exercise = await getExerciseService(userId, duplicateId);
      initialData = {
        ...exercise,
        title: `${t("copyOfPrefix")} ${exercise.title}`,
      };
    } catch {
      redirect("/exercises");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={initialData ? t("duplicateTitle") : t("createTitle")}
        description={
          initialData
            ? t("duplicateDescription")
            : t("createDescription")
        }
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
        <ExerciseFormM3 mode="create" initialData={initialData} />
      </Surface>
    </div>
  );
}
