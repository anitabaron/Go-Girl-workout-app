import { formatDuration } from "@/lib/utils/time-format";

type PlannedParams = {
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
};

type PlannedSectionProps = {
  readonly params: PlannedParams;
};

export function PlannedSection({ params }: PlannedSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-4">
      <h4 className="mb-4 text-lg font-semibold">Planowane</h4>
      <dl className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Serie
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {params.sets !== null ? params.sets : "-"}
          </dd>
        </div>
        {/* Pokaż powtórzenia tylko jeśli ćwiczenie ma planowane powtórzenia */}
        {params.reps !== null && params.reps !== undefined && (
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Powtórzeń
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {params.reps}
            </dd>
          </div>
        )}
        {/* Pokaż czas trwania tylko jeśli ćwiczenie ma planowany czas */}
        {params.duration_seconds !== null && params.duration_seconds !== undefined && (
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Czas trwania
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {formatDuration(params.duration_seconds)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Przerwa między seriami
          </dt>
          <dd className="mt-1 text-lg font-semibold">
            {params.rest_seconds !== null ? `${params.rest_seconds} s` : "-"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
