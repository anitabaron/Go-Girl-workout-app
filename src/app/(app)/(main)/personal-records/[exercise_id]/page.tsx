import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import {
  getPersonalRecordsByExerciseService,
  ServiceError,
} from "@/services/personal-records";
import { getExerciseService } from "@/services/exercises";
import { mapExercisePersonalRecordsToViewModel } from "@/lib/personal-records/view-model";
import { getTranslations } from "@/i18n/server";
import {
  EXERCISE_LABELS_NAMESPACE,
  getExercisePartLabel,
  getExerciseTypeLabel,
} from "@/lib/exercises/labels";
import { Surface } from "@/components";
import {
  ExerciseInfoM3,
  PersonalRecordDetailContentM3,
} from "@/components";

type ExercisePersonalRecordsPageProps = {
  params: Promise<{ exercise_id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExercisePersonalRecordsPage({
  params,
}: ExercisePersonalRecordsPageProps) {
  const t = await getTranslations("personalRecordsExercisePage");
  const tExerciseLabel = await getTranslations(EXERCISE_LABELS_NAMESPACE);
  const { exercise_id } = await params;

  if (!UUID_REGEX.test(exercise_id)) {
    redirect("/personal-records");
  }

  const userId = await requireAuth();

  let viewModel;
  try {
    const result = await getPersonalRecordsByExerciseService(
      userId,
      exercise_id,
    );
    viewModel = mapExercisePersonalRecordsToViewModel(result.items);

    if (!viewModel) {
      const exercise = await getExerciseService(userId, exercise_id);
      viewModel = {
        exercise: {
          id: exercise.id,
          title: exercise.title,
          type: getExerciseTypeLabel(tExerciseLabel, exercise.type),
          part: getExercisePartLabel(tExerciseLabel, exercise.part),
        },
        records: [],
      };
    } else {
      viewModel = {
        ...viewModel,
        exercise: {
          ...viewModel.exercise,
          type: getExerciseTypeLabel(tExerciseLabel, viewModel.exercise.type),
          part: getExercisePartLabel(tExerciseLabel, viewModel.exercise.part),
        },
      };
    }
  } catch (error) {
    if (error instanceof ServiceError) {
      if (
        error.code === "NOT_FOUND" ||
        error.code === "UNAUTHORIZED" ||
        error.code === "FORBIDDEN"
      ) {
        redirect("/personal-records");
      }
    }
    redirect("/personal-records");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              href="/personal-records"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              {t("backToRecords")}
            </Link>
          </Button>
        </div>
      </header>

      <Surface variant="high">
        <div className="mb-6">
          <ExerciseInfoM3 exercise={viewModel.exercise} />
        </div>
        <PersonalRecordDetailContentM3 records={viewModel.records} />
      </Surface>
    </div>
  );
}
