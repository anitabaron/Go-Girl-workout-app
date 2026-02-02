import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { ExerciseFormM3, PageHeader, Surface } from "../../_components";

export default async function NewExercisePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
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
        title: `Copy of ${exercise.title}`,
      };
    } catch {
      redirect("/m3/exercises");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={initialData ? "Duplicate exercise" : "Add exercise"}
        description={
          initialData
            ? "Edit the duplicated exercise and save as a new item."
            : "Create a new exercise for your library."
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/m3/exercises">
              <ArrowLeft className="mr-2 size-4" />
              Back to list
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
