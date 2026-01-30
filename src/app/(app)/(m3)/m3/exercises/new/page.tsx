import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { ExerciseFormM3, PageHeader, Surface } from "../../_components";

export default async function NewExercisePage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add exercise"
        description="Create a new exercise for your library."
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
        <ExerciseFormM3 mode="create" />
      </Surface>
    </div>
  );
}
