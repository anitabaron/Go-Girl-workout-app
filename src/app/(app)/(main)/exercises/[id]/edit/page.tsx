import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { getExerciseService } from "@/services/exercises";
import { ExerciseFormM3, PageHeader, Surface } from "../../../_components";

export default async function EditExercisePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const userId = await requireAuth();

  let exercise;
  try {
    exercise = await getExerciseService(userId, id);
  } catch {
    redirect("/exercises");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit exercise"
        description={`Editing: ${exercise.title}`}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/exercises/${id}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to detail
            </Link>
          </Button>
        }
      />

      <Surface variant="high">
        <ExerciseFormM3 mode="edit" initialData={exercise} />
      </Surface>
    </div>
  );
}
