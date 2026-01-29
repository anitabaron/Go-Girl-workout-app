import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlansList } from "./workout-plans-list";

type WorkoutPlanSelectorProps = {
  plans: Array<
    Omit<WorkoutPlanDTO, "exercises"> & {
      exercise_count?: number;
      exercise_names?: string[];
    }
  >;
  nextCursor?: string | null;
};

/**
 * Server Component renderujący listę planów treningowych.
 * Pobiera dane z API i przekazuje je do Client Component WorkoutPlansList.
 */
export function WorkoutPlanSelector({
  plans,
  nextCursor,
}: Readonly<WorkoutPlanSelectorProps>) {
  console.log("plans", plans);
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Wybierz plan treningowy</h2>
      <WorkoutPlansList
        initialPlans={plans}
        initialNextCursor={nextCursor ?? null}
      />
    </div>
  );
}
