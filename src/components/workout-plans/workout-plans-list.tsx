import type { WorkoutPlanDTO } from "@/types";
import { WorkoutPlanCard } from "./workout-plan-card";
import { EmptyState } from "./empty-state";
import { LoadMoreButton } from "./load-more-button";

type WorkoutPlansListProps = {
  plans: Omit<WorkoutPlanDTO, "exercises">[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export function WorkoutPlansList({
  plans,
  nextCursor,
  hasMore,
}: WorkoutPlansListProps) {
  if (plans.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <WorkoutPlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {hasMore && nextCursor && (
        <div className="flex justify-center pt-4">
          <LoadMoreButton nextCursor={nextCursor} />
        </div>
      )}
    </div>
  );
}
