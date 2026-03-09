import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { ServiceError, getTrainingProgramService } from "@/services/training-programs";
import { getWorkoutPlanService } from "@/services/workout-plans";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProgramDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProgressionSummary = {
  load?: number | null;
  volume?: number | null;
  emphasis?: string | null;
};

function extractProgressionSummary(value: unknown): ProgressionSummary {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  return {
    load:
      typeof obj.load_adjustment_percent === "number"
        ? obj.load_adjustment_percent
        : null,
    volume:
      typeof obj.volume_adjustment_percent === "number"
        ? obj.volume_adjustment_percent
        : null,
    emphasis: typeof obj.emphasis === "string" ? obj.emphasis : null,
  };
}

function adjustDiscreteValue(
  baseValue: number | null | undefined,
  adjustmentPercent: number | null | undefined,
): number | null {
  if (baseValue === null || baseValue === undefined) return null;
  if (!adjustmentPercent) return baseValue;

  const factor = 1 + adjustmentPercent / 100;
  let adjusted =
    adjustmentPercent > 0
      ? Math.ceil(baseValue * factor)
      : Math.floor(baseValue * factor);
  adjusted = Math.max(1, adjusted);

  if (adjusted === baseValue) {
    adjusted = Math.max(1, baseValue + (adjustmentPercent > 0 ? 1 : -1));
  }

  return adjusted;
}

function estimateExerciseSeconds(input: {
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  estimated_set_time_seconds: number | null;
}): number {
  const sets = input.planned_sets ?? 1;
  const perSetSeconds =
    input.estimated_set_time_seconds ??
    input.planned_duration_seconds ??
    (input.planned_reps ? input.planned_reps * 4 : 30);
  const rest = input.planned_rest_seconds ?? 45;
  return Math.max(0, sets * perSetSeconds + Math.max(0, sets - 1) * rest);
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    redirect("/programs");
  }

  const userId = await requireAuth();

  let program;
  try {
    program = await getTrainingProgramService(userId, id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      notFound();
    }
    redirect("/programs");
  }

  const uniquePlanIds = Array.from(
    new Set(program.sessions.map((session) => session.workout_plan_id)),
  );

  const planEntries = await Promise.all(
    uniquePlanIds.map(async (planId) => {
      try {
        const plan = await getWorkoutPlanService(userId, planId);
        return [planId, plan] as const;
      } catch {
        return [planId, null] as const;
      }
    }),
  );
  const plansById = new Map(planEntries);

  const sessionsByWeek = new Map<number, typeof program.sessions>();
  for (const session of program.sessions) {
    const list = sessionsByWeek.get(session.week_index) ?? [];
    list.push(session);
    sessionsByWeek.set(session.week_index, list);
  }
  const orderedWeeks = Array.from(sessionsByWeek.keys()).sort((a, b) => a - b);
  const weeklyProgression = orderedWeeks.map((week) => {
    const weekSessions = sessionsByWeek.get(week) ?? [];
    const summaries = weekSessions.map((session) =>
      extractProgressionSummary(session.progression_overrides),
    );
    const loadValues = summaries
      .map((item) => item.load)
      .filter((value): value is number => typeof value === "number");
    const volumeValues = summaries
      .map((item) => item.volume)
      .filter((value): value is number => typeof value === "number");
    const emphasis =
      summaries.find((item) => typeof item.emphasis === "string")?.emphasis ?? null;

    return {
      week,
      load:
        loadValues.length > 0
          ? Math.round(loadValues.reduce((sum, value) => sum + value, 0) / loadValues.length)
          : null,
      volume:
        volumeValues.length > 0
          ? Math.round(
              volumeValues.reduce((sum, value) => sum + value, 0) / volumeValues.length,
            )
          : null,
      emphasis,
    };
  });
  const firstProgression = weeklyProgression[0] ?? null;
  const lastProgression = weeklyProgression[weeklyProgression.length - 1] ?? null;
  const loadMin = Math.min(
    ...weeklyProgression
      .map((item) => item.load)
      .filter((value): value is number => typeof value === "number"),
    0,
  );
  const loadMax = Math.max(
    ...weeklyProgression
      .map((item) => item.load)
      .filter((value): value is number => typeof value === "number"),
    0,
  );
  const volumeMin = Math.min(
    ...weeklyProgression
      .map((item) => item.volume)
      .filter((value): value is number => typeof value === "number"),
    0,
  );
  const volumeMax = Math.max(
    ...weeklyProgression
      .map((item) => item.volume)
      .filter((value): value is number => typeof value === "number"),
    0,
  );

  const toProgressWidth = (value: number | null, min: number, max: number) => {
    if (value === null || max === min) return 0;
    const normalized = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  };
  const formatPercent = (value: number | null) =>
    value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/workout-plans?section=programs" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Wróć do programów
          </Link>
        </Button>
      </div>

      <PageHeader
        title={program.name}
        description={program.goal_text ?? "Brak opisu celu programu."}
      />

      <Surface variant="high" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{program.status}</Badge>
          <Badge variant="outline">{program.source}</Badge>
          <span className="text-xs text-muted-foreground">
            {program.duration_months} mies. • {program.sessions_per_week} treningi/tydz. •{" "}
            {program.sessions.length} sesji
          </span>
        </div>
      </Surface>

      <Surface variant="high" className="space-y-4">
        <h2 className="text-base font-semibold">Progresja programu</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Początek programu</p>
            <p className="mt-1 text-sm">
              Obciążenie: <strong>{formatPercent(firstProgression?.load ?? null)}</strong>
            </p>
            <p className="text-sm">
              Objętość: <strong>{formatPercent(firstProgression?.volume ?? null)}</strong>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Koniec programu</p>
            <p className="mt-1 text-sm">
              Obciążenie: <strong>{formatPercent(lastProgression?.load ?? null)}</strong>
            </p>
            <p className="text-sm">
              Objętość: <strong>{formatPercent(lastProgression?.volume ?? null)}</strong>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Tygodniowy rozkład</p>
          <div className="space-y-2">
            {weeklyProgression.map((item) => (
              <div key={item.week} className="rounded-lg border border-border bg-card p-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">Tydzień {item.week}</span>
                  <span className="text-muted-foreground">{item.emphasis ?? "—"}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-muted-foreground">Obciążenie</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${toProgressWidth(item.load, loadMin, loadMax)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px]">
                      {formatPercent(item.load)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-muted-foreground">Objętość</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-secondary-foreground/70"
                        style={{
                          width: `${toProgressWidth(item.volume, volumeMin, volumeMax)}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px]">
                      {formatPercent(item.volume)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <div className="space-y-4">
        {orderedWeeks.map((week) => {
          const weekSessions = (sessionsByWeek.get(week) ?? []).sort((a, b) =>
            a.scheduled_date.localeCompare(b.scheduled_date),
          );

          return (
            <Surface key={week} variant="high" className="space-y-3">
              <h2 className="text-base font-semibold">Tydzień {week}</h2>
              <div className="space-y-3">
                {weekSessions.map((session) => {
                  const plan = plansById.get(session.workout_plan_id) ?? null;
                  const progression = extractProgressionSummary(
                    session.progression_overrides,
                  );
                  const hasWarmup =
                    plan?.exercises?.some(
                      (exercise) => exercise.section_type === "Warm-up",
                    ) ?? false;
                  const estimatedPlanSeconds =
                    plan?.estimated_total_time_seconds ??
                    (plan?.exercises?.reduce((sum, exercise) => {
                      const shouldProgress = exercise.section_type === "Main Workout";
                      const volumePct = shouldProgress ? progression.volume ?? null : null;
                      const adjustReps =
                        shouldProgress && exercise.planned_reps !== null;
                      const adjustDuration =
                        shouldProgress &&
                        !adjustReps &&
                        exercise.planned_duration_seconds !== null;
                      const adjustSets =
                        shouldProgress &&
                        !adjustReps &&
                        !adjustDuration &&
                        exercise.planned_sets !== null;
                      const adjustedSets = adjustSets
                        ? adjustDiscreteValue(exercise.planned_sets, volumePct)
                        : exercise.planned_sets;
                      const adjustedReps = adjustReps
                        ? adjustDiscreteValue(exercise.planned_reps, volumePct)
                        : exercise.planned_reps;
                      const adjustedDuration = adjustDuration
                        ? adjustDiscreteValue(exercise.planned_duration_seconds, volumePct)
                        : exercise.planned_duration_seconds;

                      return (
                        sum +
                        estimateExerciseSeconds({
                          planned_sets: adjustedSets,
                          planned_reps: adjustedReps,
                          planned_duration_seconds: adjustedDuration,
                          planned_rest_seconds: exercise.planned_rest_seconds,
                          estimated_set_time_seconds:
                            exercise.estimated_set_time_seconds,
                        })
                      );
                    }, 0) ?? null);
                  const estimatedPlanMinutes =
                    estimatedPlanSeconds !== null
                      ? Math.max(1, Math.round(estimatedPlanSeconds / 60))
                      : null;

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {session.scheduled_date} •{" "}
                            {plan?.name ?? "Plan niedostępny"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {session.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rozgrzewka: {hasWarmup ? "tak" : "brak"}{" "}
                            {" • "}
                            Czas:{" "}
                            {estimatedPlanMinutes !== null
                              ? `~${estimatedPlanMinutes} min`
                              : "—"}
                          </p>
                        </div>
                        {plan ? (
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link href={`/workout-plans/${plan.id}`}>Otwórz plan</Link>
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Progresja: obciążenie{" "}
                        {progression.load !== null && progression.load !== undefined
                          ? `${progression.load > 0 ? "+" : ""}${progression.load}%`
                          : "—"}
                        {" • "}
                        objętość{" "}
                        {progression.volume !== null && progression.volume !== undefined
                          ? `${progression.volume > 0 ? "+" : ""}${progression.volume}%`
                          : "—"}
                        {" • "}
                        nacisk {progression.emphasis ?? "—"}
                      </div>

                      {plan?.exercises?.length ? (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Ćwiczenia ({plan.exercises.length})
                          </p>
                          <ul className="mt-1 grid grid-cols-1 gap-1 text-sm">
                            {plan.exercises.slice(0, 8).map((exercise) => (
                              <li key={exercise.id}>
                                {(() => {
                                  const shouldProgress =
                                    exercise.section_type === "Main Workout";
                                  const volumePct = shouldProgress
                                    ? progression.volume ?? null
                                    : null;

                                  // Single-dimension progression:
                                  // - reps-based exercise: adjust reps only
                                  // - duration-based exercise: adjust duration only
                                  // - fallback: adjust sets only
                                  const adjustReps =
                                    shouldProgress && exercise.planned_reps !== null;
                                  const adjustDuration =
                                    shouldProgress &&
                                    !adjustReps &&
                                    exercise.planned_duration_seconds !== null;
                                  const adjustSets =
                                    shouldProgress &&
                                    !adjustReps &&
                                    !adjustDuration &&
                                    exercise.planned_sets !== null;

                                  const adjustedSets = adjustSets
                                    ? adjustDiscreteValue(exercise.planned_sets, volumePct)
                                    : exercise.planned_sets;
                                  const adjustedReps = adjustReps
                                    ? adjustDiscreteValue(exercise.planned_reps, volumePct)
                                    : exercise.planned_reps;
                                  const adjustedDuration = adjustDuration
                                    ? adjustDiscreteValue(
                                        exercise.planned_duration_seconds,
                                        volumePct,
                                      )
                                    : exercise.planned_duration_seconds;

                                  const setsChanged =
                                    exercise.planned_sets !== null &&
                                    adjustedSets !== null &&
                                    adjustedSets !== exercise.planned_sets;
                                  const repsChanged =
                                    exercise.planned_reps !== null &&
                                    adjustedReps !== null &&
                                    adjustedReps !== exercise.planned_reps;
                                  const durationChanged =
                                    exercise.planned_duration_seconds !== null &&
                                    adjustedDuration !== null &&
                                    adjustedDuration !==
                                      exercise.planned_duration_seconds;

                                  return (
                                    <>
                                {exercise.exercise_title ?? "Ćwiczenie"}{" "}
                                <span className="text-xs text-muted-foreground">
                                      {exercise.planned_sets ? "• " : ""}
                                      {exercise.planned_sets ? (
                                        setsChanged ? (
                                          <span className="font-medium text-primary">
                                            {exercise.planned_sets}→{adjustedSets} serie
                                          </span>
                                        ) : (
                                          `${exercise.planned_sets} serie`
                                        )
                                      ) : null}
                                      {exercise.planned_reps ? " • " : ""}
                                      {exercise.planned_reps ? (
                                        repsChanged ? (
                                          <span className="font-medium text-primary">
                                            {exercise.planned_reps}→{adjustedReps} powt.
                                          </span>
                                        ) : (
                                          `${exercise.planned_reps} powt.`
                                        )
                                      ) : null}
                                      {exercise.planned_duration_seconds ? " • " : ""}
                                      {exercise.planned_duration_seconds ? (
                                        durationChanged ? (
                                          <span className="font-medium text-primary">
                                            {exercise.planned_duration_seconds}s→
                                            {adjustedDuration}s
                                          </span>
                                        ) : (
                                          `${exercise.planned_duration_seconds}s`
                                        )
                                      ) : null}
                                </span>
                                    </>
                                  );
                                })()}
                              </li>
                            ))}
                          </ul>
                          {plan.exercises.length > 8 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              +{plan.exercises.length - 8} więcej
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}
