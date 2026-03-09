import { createClient } from "@/db/supabase.server";
import type { Json } from "@/db/database.types";
import {
  assertUser,
  mapDbError,
  parseOrThrow,
  ServiceError,
} from "@/lib/service-utils";
import {
  programCreateSchema,
  programGenerateSchema,
  programListQuerySchema,
  programSessionListQuerySchema,
  programSessionUpdateSchema,
  programUpdateSchema,
} from "@/lib/validation/training-programs";
import {
  deleteTrainingProgramById,
  findTrainingProgramById,
  findProgramSessionById,
  insertProgramSessions,
  insertTrainingProgram,
  linkProgramSessionToWorkoutSession,
  listProgramSessionsByUserId,
  listProgramSessionsByProgramId,
  listTrainingProgramsByUserId,
  listWorkoutPlansForProgramGeneration,
  updateProgramSessionById,
  updateTrainingProgramById,
} from "@/repositories/training-programs";
import {
  findWorkoutPlanById,
  insertWorkoutPlan,
  insertWorkoutPlanExercises,
  listWorkoutPlanExercises,
  updateWorkoutPlan,
} from "@/repositories/workout-plans";
import { getOrCreateAICoachProfileService } from "@/services/ai-coach-profiles";
import { startWorkoutSessionService } from "@/services/workout-sessions";
import { calculatePlanEstimatedTotalTimeSeconds } from "@/lib/workout-plans/estimated-time";
import type {
  ExercisePart,
  ExerciseType,
  ProgramListQueryParams,
  ProgramGeneratedPlanTemplate,
  ProgramSessionListQueryParams,
  ProgramSessionCreateCommand,
  ProgramUpdateCommand,
  TrainingProgramDTO,
  WorkoutPlanExerciseDTO,
} from "@/types";

export { ServiceError } from "@/lib/service-utils";

type PlanPreview = {
  id: string;
  name: string;
  part: string | null;
  description?: string | null;
};

type ProgramGeneratedSession = {
  workout_plan_id?: string;
  workout_plan_name: string;
  generated_plan?: ProgramGeneratedPlanTemplate;
  scheduled_date: string;
  week_index: number;
  session_index: number;
  status: "planned";
  progression_overrides: {
    load_adjustment_percent: number;
    volume_adjustment_percent: number;
    emphasis: string;
  };
};

type ProgramGenerationMode = "existing_only" | "mix_existing_new" | "new_only";

type SchedulePlanCandidate = {
  workout_plan_id?: string;
  workout_plan_name: string;
  generated_plan?: ProgramGeneratedPlanTemplate;
};

export type ProgramGenerateResponse = {
  program: {
    name: string;
    goal_text: string;
    duration_months: 1 | 2 | 3;
    weeks_count: number;
    sessions_per_week: number;
    program_mode: ProgramGenerationMode;
    mix_ratio: number;
    source: "ai";
    status: "draft";
    coach_profile_snapshot: Record<string, unknown> | null;
  };
  sessions: ProgramGeneratedSession[];
  recommendations: string[];
};

const DEFAULT_WEEKDAY_MAP: Record<number, number[]> = {
  1: [2],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const WEEKDAY_CODE_TO_OFFSET: Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  number
> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

function getWeeksCount(durationMonths: 1 | 2 | 3): number {
  if (durationMonths === 1) return 4;
  if (durationMonths === 2) return 8;
  return 12;
}

function dateToIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfCurrentWeekMonday(baseDate = new Date()): Date {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function buildInterpretedGoalText(goalText: string, constraints?: string | null): string {
  const text = `${goalText} ${constraints ?? ""}`.toLowerCase();
  const focuses: string[] = [];

  if (/l-?sit|kompres|unoszen|zginacz/.test(text)) {
    focuses.push("progresja do L-sit i poprawa kompresji bioder");
  }
  if (/handstand|stanie na ręk|pike|bark/.test(text)) {
    focuses.push("siłowe przygotowanie pod wejście do handstandu");
  }
  if (/pole|poledance|handspring|shouldermount/.test(text)) {
    focuses.push("transfer siłowo-mobilnościowy pod figury pole dance");
  }
  if (/kontuz|ból|bol|kolano|bark/.test(text)) {
    focuses.push("bezpieczna progresja z kontrolą przeciążeń");
  }

  if (focuses.length === 0) {
    return "Program ukierunkowany na rozwój siły, mobilności i stabilizacji z progresją tygodniową.";
  }

  const topFocuses = focuses.slice(0, 3);
  return `Program ukierunkowany na ${topFocuses.join(", ")}.`;
}

function buildProgramNameFromInterpretation(interpretedGoalText: string): string {
  const normalized = interpretedGoalText
    .replace(/^Program ukierunkowany na /i, "")
    .replace(/\.$/, "")
    .trim();
  const short = normalized.length > 56 ? `${normalized.slice(0, 53)}...` : normalized;
  return `Program: ${short}`;
}

function buildRecommendations(
  weeksCount: number,
  sessionsPerWeek: number,
  plans: Array<{ workout_plan_name: string }>,
  mode: ProgramGenerationMode,
  mixRatio: number,
): string[] {
  const recs = [
    `Realizuj ${sessionsPerWeek} treningi tygodniowo przez ${weeksCount} tygodni bez nadrabiania opuszczonych dni pod rząd.`,
    "Po każdym 3-4 tygodniu oceń regenerację i jakość snu, zanim zwiększysz obciążenie.",
    `Program opiera się na ${plans.length} planach i progresji tygodniowej zamiast mnożenia wielu różnych jednostek.`,
  ];

  if (mode === "mix_existing_new") {
    recs.push(
      `Tryb Mix: około ${mixRatio}% sesji bazuje na Twoich planach, a ${100 - mixRatio}% to nowe propozycje AI.`,
    );
  } else if (mode === "new_only") {
    recs.push("Tryb Nowy: program opiera się na nowych ćwiczeniach AI zapisanych jako snapshoty.");
  } else {
    recs.push("Tryb Twoje: program korzysta wyłącznie z Twoich istniejących planów treningowych.");
  }

  if (plans.length > 1) {
    recs.push("Rotuj jednostki treningowe, żeby rozłożyć obciążenie grup mięśniowych w skali tygodnia.");
  } else {
    recs.push("Przy jednym planie używaj lżejszej i cięższej wersji tej samej jednostki dla lepszej regeneracji.");
  }

  return recs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dedupeByName(candidates: SchedulePlanCandidate[]): SchedulePlanCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.workout_plan_name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAIAuthoredPlanCandidate(plan: PlanPreview): boolean {
  const name = plan.name.toLowerCase();
  const description = (plan.description ?? "").toLowerCase();
  return (
    name.startsWith("ai ") ||
    name.includes("· sesja") ||
    description.startsWith("ai:") ||
    description.startsWith("plan ai:") ||
    description.startsWith("plan wygenerowany dla programu:")
  );
}

function pickSeedPlansForProgram(
  mode: ProgramGenerationMode,
  sessionsPerWeek: number,
  mixRatio: number,
  existingCandidates: SchedulePlanCandidate[],
  newCandidates: SchedulePlanCandidate[],
): SchedulePlanCandidate[] {
  const targetCount = clamp(sessionsPerWeek, 2, 3);

  if (mode === "existing_only") {
    return existingCandidates.slice(0, targetCount);
  }

  if (mode === "new_only") {
    return newCandidates.slice(0, targetCount);
  }

  // mix_existing_new: keep total plans small (2-3), split by ratio.
  const hasExisting = existingCandidates.length > 0;
  const hasNew = newCandidates.length > 0;

  if (!hasExisting) return newCandidates.slice(0, targetCount);
  if (!hasNew) return existingCandidates.slice(0, targetCount);

  let existingCount = Math.round((targetCount * mixRatio) / 100);
  existingCount = clamp(existingCount, 1, targetCount - 1);
  const newCount = targetCount - existingCount;

  return [
    ...existingCandidates.slice(0, existingCount),
    ...newCandidates.slice(0, newCount),
  ];
}

function makeTemplate(
  templateKey: string,
  name: string,
  part: ExercisePart | null,
  exercises: Array<{
    section_type: ExerciseType;
    exercise_title: string;
    exercise_part?: ExercisePart | null;
    exercise_type?: ExerciseType | null;
    exercise_details?: string | null;
    planned_sets?: number | null;
    planned_reps?: number | null;
    planned_duration_seconds?: number | null;
    planned_rest_seconds?: number | null;
  }>,
): ProgramGeneratedPlanTemplate {
  return {
    template_key: templateKey,
    name,
    part,
    description: "AI: nowy plan wygenerowany pod cel programu",
    exercises: exercises.map((exercise, index) => ({
      ...exercise,
      section_order: index + 1,
      planned_rest_after_series_seconds: null,
      estimated_set_time_seconds: null,
      exercise_is_unilateral: null,
    })),
  };
}

function buildAIPlanTemplates(
  goalText: string,
  constraints?: string | null,
): ProgramGeneratedPlanTemplate[] {
  const text = `${goalText} ${constraints ?? ""}`.toLowerCase();

  const hasLSit = /\bl-?sit\b|kompres|unoszen|core/.test(text);
  const hasHandstand = /handstand|stanie na ręk|pike|bark/.test(text);
  const hasPole = /pole|poledance|shouldermount|handspring/.test(text);

  const templates: ProgramGeneratedPlanTemplate[] = [];

  if (hasLSit || hasPole) {
    templates.push(
      makeTemplate("ai-core-compression", "AI Core Compression", "Core", [
        {
          section_type: "Warm-up",
          exercise_title: "90/90 Hip Flow",
          exercise_part: "Core",
          exercise_type: "Warm-up",
          planned_sets: 2,
          planned_duration_seconds: 40,
          planned_rest_seconds: 20,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Seated Pike Leg Lifts",
          exercise_part: "Core",
          exercise_type: "Main Workout",
          planned_sets: 4,
          planned_reps: 8,
          planned_rest_seconds: 60,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Tuck L-sit Hold (parallettes)",
          exercise_part: "Core",
          exercise_type: "Main Workout",
          planned_sets: 5,
          planned_duration_seconds: 15,
          planned_rest_seconds: 75,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Hollow Body Hold",
          exercise_part: "Core",
          exercise_type: "Main Workout",
          planned_sets: 4,
          planned_duration_seconds: 25,
          planned_rest_seconds: 60,
        },
        {
          section_type: "Cool-down",
          exercise_title: "Hip Flexor Stretch",
          exercise_part: "Legs",
          exercise_type: "Cool-down",
          planned_sets: 2,
          planned_duration_seconds: 45,
          planned_rest_seconds: 20,
        },
      ]),
    );
  }

  if (hasHandstand || hasPole) {
    templates.push(
      makeTemplate("ai-shoulder-stack", "AI Shoulder Stack", "Arms", [
        {
          section_type: "Warm-up",
          exercise_title: "Scapular Wall Slides",
          exercise_part: "Arms",
          exercise_type: "Warm-up",
          planned_sets: 2,
          planned_reps: 12,
          planned_rest_seconds: 30,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Wall Lean Handstand Hold",
          exercise_part: "Arms",
          exercise_type: "Main Workout",
          planned_sets: 5,
          planned_duration_seconds: 20,
          planned_rest_seconds: 75,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Box Pike Press Negative",
          exercise_part: "Arms",
          exercise_type: "Main Workout",
          planned_sets: 4,
          planned_reps: 6,
          planned_rest_seconds: 90,
        },
        {
          section_type: "Main Workout",
          exercise_title: "Scapula Push-up",
          exercise_part: "Arms",
          exercise_type: "Main Workout",
          planned_sets: 4,
          planned_reps: 10,
          planned_rest_seconds: 60,
        },
        {
          section_type: "Cool-down",
          exercise_title: "Lat + Shoulder Stretch",
          exercise_part: "Back",
          exercise_type: "Cool-down",
          planned_sets: 2,
          planned_duration_seconds: 40,
          planned_rest_seconds: 20,
        },
      ]),
    );
  }

  templates.push(
    makeTemplate("ai-pull-entry", "AI Pull Entry", "Back", [
      {
        section_type: "Warm-up",
        exercise_title: "Dead Hang + Scap Pull",
        exercise_part: "Back",
        exercise_type: "Warm-up",
        planned_sets: 2,
        planned_duration_seconds: 25,
        planned_rest_seconds: 30,
      },
      {
        section_type: "Main Workout",
        exercise_title: "Active Hang Knee Raise",
        exercise_part: "Core",
        exercise_type: "Main Workout",
        planned_sets: 4,
        planned_reps: 8,
        planned_rest_seconds: 75,
      },
      {
        section_type: "Main Workout",
        exercise_title: "Band Assisted Invert Entry Drill",
        exercise_part: "Back",
        exercise_type: "Main Workout",
        planned_sets: 4,
        planned_reps: 6,
        planned_rest_seconds: 90,
      },
      {
        section_type: "Main Workout",
        exercise_title: "Reverse Plank",
        exercise_part: "Core",
        exercise_type: "Main Workout",
        planned_sets: 3,
        planned_duration_seconds: 35,
        planned_rest_seconds: 60,
      },
      {
        section_type: "Cool-down",
        exercise_title: "Thoracic + Hamstring Mobility",
        exercise_part: "Back",
        exercise_type: "Cool-down",
        planned_sets: 2,
        planned_duration_seconds: 45,
        planned_rest_seconds: 20,
      },
    ]),
  );

  return dedupeByName(templates.map((template) => ({
    workout_plan_name: template.name,
    generated_plan: template,
  })))
    .slice(0, 3)
    .map((item) => item.generated_plan!)
    .filter(Boolean);
}

type PlanExerciseInsertShape = {
  exercise_id: string | null;
  snapshot_id: string | null;
  scope_id: string | null;
  in_scope_nr: number | null;
  scope_repeat_count: number | null;
  exercise_title: string | null;
  exercise_type: ExerciseType | null;
  exercise_part: ExercisePart | null;
  exercise_details: string | null;
  exercise_is_unilateral: boolean | null;
  section_type: ExerciseType;
  section_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  planned_rest_after_series_seconds: number | null;
  estimated_set_time_seconds: number | null;
};

const TARGET_PLAN_MIN_SECONDS = 50 * 60;
const TARGET_PLAN_MAX_SECONDS = 60 * 60;

function clonePlanExercises(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  return exercises.map((exercise) => ({ ...exercise }));
}

function normalizePlanDuration(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  const normalized = clonePlanExercises(exercises);
  const mainWorkoutIndexes = normalized
    .map((exercise, index) =>
      exercise.section_type === "Main Workout" ? index : -1,
    )
    .filter((index) => index >= 0);

  if (mainWorkoutIndexes.length === 0) {
    return normalized;
  }

  const estimate = () => calculatePlanEstimatedTotalTimeSeconds(normalized);
  let estimated = estimate() ?? 0;
  let cursor = 0;
  let guard = 0;

  while (estimated < TARGET_PLAN_MIN_SECONDS && guard < 500) {
    const index = mainWorkoutIndexes[cursor % mainWorkoutIndexes.length]!;
    const ex = normalized[index]!;

    if (ex.planned_reps && ex.planned_reps > 0) {
      ex.planned_reps = Math.min(30, ex.planned_reps + 1);
    } else if (ex.planned_duration_seconds && ex.planned_duration_seconds > 0) {
      ex.planned_duration_seconds = Math.min(180, ex.planned_duration_seconds + 3);
    } else if (ex.planned_sets && ex.planned_sets > 0) {
      ex.planned_sets = Math.min(10, ex.planned_sets + 1);
    } else {
      ex.planned_reps = 8;
      ex.planned_sets = Math.max(1, ex.planned_sets ?? 1);
    }

    estimated = estimate() ?? 0;
    cursor += 1;
    guard += 1;
  }

  cursor = 0;
  guard = 0;
  while (estimated > TARGET_PLAN_MAX_SECONDS && guard < 500) {
    const index = mainWorkoutIndexes[cursor % mainWorkoutIndexes.length]!;
    const ex = normalized[index]!;

    if (ex.planned_sets && ex.planned_sets > 1) {
      ex.planned_sets = Math.max(1, ex.planned_sets - 1);
    } else if (ex.planned_reps && ex.planned_reps > 5) {
      ex.planned_reps = Math.max(5, ex.planned_reps - 1);
    } else if (ex.planned_duration_seconds && ex.planned_duration_seconds > 20) {
      ex.planned_duration_seconds = Math.max(20, ex.planned_duration_seconds - 3);
    }

    estimated = estimate() ?? 0;
    cursor += 1;
    guard += 1;
  }

  return normalized;
}

function mapPlanExerciseToGeneratedInput(
  exercise: WorkoutPlanExerciseDTO,
): ProgramGeneratedPlanTemplate["exercises"][number] {
  return {
    exercise_id: exercise.exercise_id ?? null,
    section_type: exercise.section_type,
    section_order: exercise.section_order,
    exercise_title: exercise.exercise_title ?? "Ćwiczenie",
    exercise_type: exercise.exercise_type ?? exercise.section_type,
    exercise_part: exercise.exercise_part ?? null,
    exercise_details: exercise.exercise_details ?? null,
    exercise_is_unilateral: exercise.exercise_is_unilateral ?? null,
    planned_sets: exercise.planned_sets ?? null,
    planned_reps: exercise.planned_reps ?? null,
    planned_duration_seconds: exercise.planned_duration_seconds ?? null,
    planned_rest_seconds: exercise.planned_rest_seconds ?? null,
    planned_rest_after_series_seconds:
      exercise.planned_rest_after_series_seconds ?? null,
    estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
  };
}

async function buildMixedTemplatesFromExistingAndAI(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  existingPlans: PlanPreview[],
  aiTemplates: ProgramGeneratedPlanTemplate[],
  targetCount: number,
): Promise<ProgramGeneratedPlanTemplate[]> {
  const mixedTemplates: ProgramGeneratedPlanTemplate[] = [];
  const cache = new Map<string, Awaited<ReturnType<typeof listWorkoutPlanExercises>>["data"]>();

  for (let i = 0; i < targetCount; i += 1) {
    const sourcePlan = existingPlans[i % existingPlans.length]!;
    const aiTemplate = aiTemplates[i % aiTemplates.length]!;
    let sourceExercises = cache.get(sourcePlan.id);
    if (!sourceExercises) {
      const { data, error } = await listWorkoutPlanExercises(supabase, sourcePlan.id);
      if (error) throw mapDbError(error);
      sourceExercises = data ?? [];
      cache.set(sourcePlan.id, sourceExercises);
    }
    if (sourceExercises.length === 0) continue;

    const existingWarmup = sourceExercises
      .filter((exercise) => exercise.section_type === "Warm-up")
      .slice(0, 1)
      .map(mapPlanExerciseToGeneratedInput);
    const existingMain = sourceExercises
      .filter((exercise) => exercise.section_type === "Main Workout")
      .slice(0, 4)
      .map(mapPlanExerciseToGeneratedInput);
    const existingCooldown = sourceExercises
      .filter((exercise) => exercise.section_type === "Cool-down")
      .slice(0, 1)
      .map(mapPlanExerciseToGeneratedInput);

    const aiWarmup = aiTemplate.exercises
      .filter((exercise) => exercise.section_type === "Warm-up")
      .slice(0, 1)
      .map((exercise) => ({ ...exercise, exercise_id: null }));
    const aiMain = aiTemplate.exercises
      .filter((exercise) => exercise.section_type === "Main Workout")
      .slice(0, 3)
      .map((exercise) => ({ ...exercise, exercise_id: null }));
    const aiCooldown = aiTemplate.exercises
      .filter((exercise) => exercise.section_type === "Cool-down")
      .slice(0, 1)
      .map((exercise) => ({ ...exercise, exercise_id: null }));

    const mainCombined = [...existingMain.slice(0, 3), ...aiMain.slice(0, 2)];
    const warmupCombined = existingWarmup.length > 0 ? existingWarmup : aiWarmup;
    const cooldownCombined = existingCooldown.length > 0 ? existingCooldown : aiCooldown;
    const exercises = [...warmupCombined, ...mainCombined, ...cooldownCombined].map(
      (exercise, index) => ({ ...exercise, section_order: index + 1 }),
    );
    if (exercises.length === 0) continue;

    mixedTemplates.push({
      template_key: `mix-${sourcePlan.id}-${aiTemplate.template_key}-${i + 1}`,
      name: `Mix ${i + 1}: ${sourcePlan.name}`,
      description: "Plan mieszany: Twoje ćwiczenia + nowe propozycje AI",
      part: sourcePlan.part as ExercisePart | null,
      exercises,
    });
  }

  return mixedTemplates;
}

function ensureWarmupAndCooldown(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  const hasWarmup = exercises.some((exercise) => exercise.section_type === "Warm-up");
  const hasCooldown = exercises.some((exercise) => exercise.section_type === "Cool-down");

  const next = [...exercises];
  if (!hasWarmup) {
    next.unshift({
      exercise_id: null,
      snapshot_id: null,
      scope_id: null,
      in_scope_nr: null,
      scope_repeat_count: null,
      exercise_title: "AI Warm-up Activation",
      exercise_type: "Warm-up",
      exercise_part: "Core",
      exercise_details: "Krótka aktywacja i mobilizacja przed częścią główną.",
      exercise_is_unilateral: null,
      section_type: "Warm-up",
      section_order: 1,
      planned_sets: 1,
      planned_reps: null,
      planned_duration_seconds: 300,
      planned_rest_seconds: 30,
      planned_rest_after_series_seconds: null,
      estimated_set_time_seconds: null,
    });
  }

  if (!hasCooldown) {
    next.push({
      exercise_id: null,
      snapshot_id: null,
      scope_id: null,
      in_scope_nr: null,
      scope_repeat_count: null,
      exercise_title: "AI Cool-down Mobility",
      exercise_type: "Cool-down",
      exercise_part: "Core",
      exercise_details: "Wyciszenie i oddech po treningu.",
      exercise_is_unilateral: null,
      section_type: "Cool-down",
      section_order: next.length + 1,
      planned_sets: 1,
      planned_reps: null,
      planned_duration_seconds: 240,
      planned_rest_seconds: 20,
      planned_rest_after_series_seconds: null,
      estimated_set_time_seconds: null,
    });
  }

  return next.map((exercise, index) => ({
    ...exercise,
    section_order: index + 1,
  }));
}

function enforceWarmupCooldownMinutes(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  const next = clonePlanExercises(exercises);

  const warmupIndexes = next
    .map((exercise, index) => (exercise.section_type === "Warm-up" ? index : -1))
    .filter((index) => index >= 0);
  if (warmupIndexes.length > 0) {
    const firstWarmup = next[warmupIndexes[0]!]!;
    const current = firstWarmup.planned_duration_seconds ?? 0;
    if (current < 240) {
      firstWarmup.planned_duration_seconds = 240;
      firstWarmup.planned_sets = 1;
      firstWarmup.planned_reps = null;
    }
  }

  const cooldownIndexes = next
    .map((exercise, index) => (exercise.section_type === "Cool-down" ? index : -1))
    .filter((index) => index >= 0);
  if (cooldownIndexes.length > 0) {
    const firstCooldown = next[cooldownIndexes[0]!]!;
    const current = firstCooldown.planned_duration_seconds ?? 0;
    if (current < 180) {
      firstCooldown.planned_duration_seconds = 180;
      firstCooldown.planned_sets = 1;
      firstCooldown.planned_reps = null;
    }
  }

  return next.map((exercise, index) => ({
    ...exercise,
    section_order: index + 1,
  }));
}

function generateProgramSchedule(
  plans: SchedulePlanCandidate[],
  durationMonths: 1 | 2 | 3,
  sessionsPerWeek: number,
  weekdaysCodes?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">,
): ProgramGeneratedSession[] {
  const weeksCount = getWeeksCount(durationMonths);
  const weekdaysFromCodes =
    weekdaysCodes && weekdaysCodes.length > 0
      ? Array.from(new Set(weekdaysCodes.map((code) => WEEKDAY_CODE_TO_OFFSET[code]))).sort(
          (a, b) => a - b,
        )
      : null;
  const weekdays =
    weekdaysFromCodes && weekdaysFromCodes.length > 0
      ? weekdaysFromCodes
      : (DEFAULT_WEEKDAY_MAP[sessionsPerWeek] ?? DEFAULT_WEEKDAY_MAP[2]);
  const weekStart = startOfCurrentWeekMonday();
  const sessions: ProgramGeneratedSession[] = [];
  let sessionIndex = 1;

  for (let week = 1; week <= weeksCount; week += 1) {
    const loadAdjustment = Math.min(12, (week - 1) * 2);
    const volumeAdjustment = Math.min(10, (week - 1) * 2);
    const emphasis = week % 4 === 0 ? "deload" : "progressive";

    for (let i = 0; i < weekdays.length; i += 1) {
      const dayOffset = weekdays[i]!;
      const plan = plans[(sessionIndex - 1) % plans.length]!;
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + (week - 1) * 7 + dayOffset);

      sessions.push({
        workout_plan_id: plan.workout_plan_id,
        workout_plan_name: plan.workout_plan_name,
        generated_plan: plan.generated_plan,
        scheduled_date: dateToIsoDate(dayDate),
        week_index: week,
        session_index: sessionIndex,
        status: "planned",
        progression_overrides: {
          load_adjustment_percent: loadAdjustment,
          volume_adjustment_percent: emphasis === "deload" ? -15 : volumeAdjustment,
          emphasis,
        },
      });

      sessionIndex += 1;
    }
  }

  return sessions;
}

type SessionWithPlanRef = {
  workout_plan_id: string;
  scheduled_date: string;
  week_index: number;
  session_index: number;
  status: "planned" | "completed";
  progression_overrides?: Record<string, unknown> | null;
  workout_plan_name?: string;
};

type SessionWithOptionalPlanRef = Omit<ProgramSessionCreateCommand, "workout_plan_id"> & {
  workout_plan_id?: string;
  workout_plan_name?: string;
};

async function createPlansFromGeneratedTemplates(
  userId: string,
  programName: string,
  sessions: SessionWithOptionalPlanRef[],
): Promise<{
  resolvedSessions: SessionWithPlanRef[];
  createdPlanIds: Set<string>;
}> {
  const supabase = await createClient();
  const createdPlanIds = new Set<string>();
  const planIdByTemplateKey = new Map<string, string>();
  const planNameByTemplateKey = new Map<string, string>();
  const resolvedSessions: SessionWithPlanRef[] = [];

  for (const session of sessions) {
    if (session.workout_plan_id) {
      resolvedSessions.push({
        workout_plan_id: session.workout_plan_id,
        scheduled_date: session.scheduled_date,
        week_index: session.week_index,
        session_index: session.session_index,
        status: session.status ?? "planned",
        progression_overrides: session.progression_overrides ?? null,
        workout_plan_name: session.workout_plan_name,
      });
      continue;
    }

    const template = session.generated_plan;
    if (!template) {
      throw new ServiceError(
        "BAD_REQUEST",
        "Sesja programu musi zawierać workout_plan_id lub generated_plan.",
      );
    }

    const existingTemplatePlanId = planIdByTemplateKey.get(template.template_key);
    if (existingTemplatePlanId) {
      const existingTemplatePlanName =
        planNameByTemplateKey.get(template.template_key) ?? template.name;
      resolvedSessions.push({
        workout_plan_id: existingTemplatePlanId,
        scheduled_date: session.scheduled_date,
        week_index: session.week_index,
        session_index: session.session_index,
        status: session.status ?? "planned",
        progression_overrides: session.progression_overrides ?? null,
        workout_plan_name: existingTemplatePlanName,
      });
      continue;
    }

    const generatedPlanName = `${programName} · Sesja ${planIdByTemplateKey.size + 1}`;

    const { data: insertedPlan, error: insertedPlanError } = await insertWorkoutPlan(
      supabase,
      userId,
      {
        name: generatedPlanName,
        description: template.description ?? "Plan AI: nowy szablon programu",
        part: template.part ?? null,
        estimated_total_time_seconds: null,
      },
    );
    if (insertedPlanError) throw mapDbError(insertedPlanError);
    if (!insertedPlan) {
      throw new ServiceError("INTERNAL", "Nie udało się utworzyć planu z szablonu AI.");
    }

    const generatedExercises = normalizePlanDuration(
      enforceWarmupCooldownMinutes(
        ensureWarmupAndCooldown(
      template.exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id ?? null,
        snapshot_id: null,
        scope_id: null,
        in_scope_nr: null,
        scope_repeat_count: null,
        exercise_title: exercise.exercise_title,
        exercise_type: exercise.exercise_type ?? exercise.section_type,
        exercise_part: exercise.exercise_part ?? template.part ?? null,
        exercise_details: exercise.exercise_details ?? null,
        exercise_is_unilateral: exercise.exercise_is_unilateral ?? null,
        section_type: exercise.section_type,
        section_order: exercise.section_order,
        planned_sets: exercise.planned_sets ?? null,
        planned_reps: exercise.planned_reps ?? null,
        planned_duration_seconds: exercise.planned_duration_seconds ?? null,
        planned_rest_seconds: exercise.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          exercise.planned_rest_after_series_seconds ?? null,
        estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
      })),
        ),
      ),
    );

    const { error: insertExercisesError } = await insertWorkoutPlanExercises(
      supabase,
      insertedPlan.id,
      generatedExercises,
    );
    if (insertExercisesError) throw mapDbError(insertExercisesError);

    const estimatedTotalTime = calculatePlanEstimatedTotalTimeSeconds(generatedExercises);
    const { error: updateEstimatedTimeError } = await updateWorkoutPlan(
      supabase,
      userId,
      insertedPlan.id,
      { estimated_total_time_seconds: estimatedTotalTime },
    );
    if (updateEstimatedTimeError) throw mapDbError(updateEstimatedTimeError);

    planIdByTemplateKey.set(template.template_key, insertedPlan.id);
    planNameByTemplateKey.set(template.template_key, generatedPlanName);
    createdPlanIds.add(insertedPlan.id);
    resolvedSessions.push({
      workout_plan_id: insertedPlan.id,
      scheduled_date: session.scheduled_date,
      week_index: session.week_index,
      session_index: session.session_index,
      status: session.status ?? "planned",
      progression_overrides: session.progression_overrides ?? null,
      workout_plan_name: generatedPlanName,
    });
  }

  return { resolvedSessions, createdPlanIds };
}

async function cloneReferencedPlansForProgram<T extends SessionWithPlanRef>(
  userId: string,
  programName: string,
  sessions: T[],
  skipClonePlanIds?: Set<string>,
): Promise<T[]> {
  const supabase = await createClient();
  const uniqueSourcePlanIds = Array.from(new Set(sessions.map((s) => s.workout_plan_id)));
  const clonedPlanIdBySourceId = new Map<string, string>();
  const sourceNameById = new Map<string, string>();

  for (let idx = 0; idx < uniqueSourcePlanIds.length; idx += 1) {
    const sourcePlanId = uniqueSourcePlanIds[idx]!;
    if (skipClonePlanIds?.has(sourcePlanId)) {
      clonedPlanIdBySourceId.set(sourcePlanId, sourcePlanId);
      continue;
    }
    const { data: sourcePlan, error: sourcePlanError } = await findWorkoutPlanById(
      supabase,
      userId,
      sourcePlanId,
    );
    if (sourcePlanError) throw mapDbError(sourcePlanError);
    if (!sourcePlan) {
      throw new ServiceError("NOT_FOUND", "Nie znaleziono planu źródłowego dla programu.");
    }

    const { data: sourceExercises, error: sourceExercisesError } =
      await listWorkoutPlanExercises(supabase, sourcePlanId);
    if (sourceExercisesError) throw mapDbError(sourceExercisesError);
    if (!sourceExercises || sourceExercises.length === 0) {
      throw new ServiceError(
        "CONFLICT",
        "Plan źródłowy nie zawiera ćwiczeń. Nie można utworzyć programu.",
      );
    }

    const clonedPlanName =
      uniqueSourcePlanIds.length === 1
        ? `${programName} · Sesja`
        : `${programName} · Sesja ${idx + 1}`;

    const { data: insertedPlan, error: insertPlanError } = await insertWorkoutPlan(
      supabase,
      userId,
      {
        name: clonedPlanName,
        description: `Plan wygenerowany dla programu: ${programName}`,
        part: sourcePlan.part,
        estimated_total_time_seconds: sourcePlan.estimated_total_time_seconds ?? null,
      },
    );
    if (insertPlanError) throw mapDbError(insertPlanError);
    if (!insertedPlan) {
      throw new ServiceError("INTERNAL", "Nie udało się utworzyć planu dla programu.");
    }

    const sourceMappedExercises: PlanExerciseInsertShape[] = sourceExercises.map(
      (exercise) => ({
        exercise_id: exercise.exercise_id ?? null,
        snapshot_id: exercise.snapshot_id ?? null,
        scope_id: exercise.scope_id ?? null,
        in_scope_nr: exercise.in_scope_nr ?? null,
        scope_repeat_count: exercise.scope_repeat_count ?? null,
        exercise_title: exercise.exercise_title ?? null,
        exercise_type: exercise.exercise_type ?? null,
        exercise_part: exercise.exercise_part ?? null,
        exercise_details: exercise.exercise_details ?? null,
        exercise_is_unilateral: exercise.exercise_is_unilateral ?? null,
        section_type: exercise.section_type,
        section_order: exercise.section_order,
        planned_sets: exercise.planned_sets ?? null,
        planned_reps: exercise.planned_reps ?? null,
        planned_duration_seconds: exercise.planned_duration_seconds ?? null,
        planned_rest_seconds: exercise.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          exercise.planned_rest_after_series_seconds ?? null,
        estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
      }),
    );
    const clonedExercises = normalizePlanDuration(
      enforceWarmupCooldownMinutes(ensureWarmupAndCooldown(sourceMappedExercises)),
    );

    const { error: insertExercisesError } = await insertWorkoutPlanExercises(
      supabase,
      insertedPlan.id,
      clonedExercises,
    );
    if (insertExercisesError) throw mapDbError(insertExercisesError);

    const estimatedTotalTime = calculatePlanEstimatedTotalTimeSeconds(clonedExercises);
    const { error: updateEstimatedTimeError } = await updateWorkoutPlan(
      supabase,
      userId,
      insertedPlan.id,
      { estimated_total_time_seconds: estimatedTotalTime },
    );
    if (updateEstimatedTimeError) throw mapDbError(updateEstimatedTimeError);

    clonedPlanIdBySourceId.set(sourcePlanId, insertedPlan.id);
    sourceNameById.set(sourcePlanId, sourcePlan.name);
  }

  return sessions.map((session) => {
    const clonedId = clonedPlanIdBySourceId.get(session.workout_plan_id);
    const sourceName = sourceNameById.get(session.workout_plan_id);
    if (!clonedId) return session;
    return {
      ...session,
      workout_plan_id: clonedId,
      ...(session.workout_plan_name !== undefined
        ? { workout_plan_name: sourceName ?? session.workout_plan_name }
        : {}),
    };
  });
}

async function getProgramWithSessions(
  userId: string,
  programId: string,
): Promise<TrainingProgramDTO> {
  const supabase = await createClient();

  const { data: program, error: programError } = await findTrainingProgramById(
    supabase,
    userId,
    programId,
  );
  if (programError) throw mapDbError(programError);
  if (!program) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  const { data: sessions, error: sessionsError } = await listProgramSessionsByUserId(
    supabase,
    userId,
    {},
  );
  if (sessionsError) throw mapDbError(sessionsError);

  return {
    ...program,
    sessions: (sessions ?? []).filter((item) => item.training_program_id === program.id),
  };
}

export async function generateAIProgramService(
  userId: string,
  payload: unknown,
): Promise<ProgramGenerateResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(programGenerateSchema, payload);
  const supabase = await createClient();

  const { data: plans, error: plansError } = await listWorkoutPlansForProgramGeneration(
    supabase,
    userId,
    12,
  );
  if (plansError) throw mapDbError(plansError);

  const planRows = (plans ?? []) as PlanPreview[];
  const mode = parsed.program_mode;
  const mixRatio = clamp(parsed.mix_ratio, 10, 90);
  if (mode === "existing_only" && planRows.length === 0) {
    throw new ServiceError(
      "CONFLICT",
      "Brak planów treningowych dla trybu 'Twoje plany'. Dodaj plan lub wybierz tryb Mix/Nowy.",
    );
  }

  const coachProfile = await getOrCreateAICoachProfileService(userId);
  const aiTemplates = buildAIPlanTemplates(parsed.goal_text, parsed.constraints);
  const nonAICandidates = planRows.filter((plan) => !isAIAuthoredPlanCandidate(plan));
  const sourcePlansForExisting = nonAICandidates.length > 0 ? nonAICandidates : planRows;
  const existingCandidates: SchedulePlanCandidate[] = sourcePlansForExisting.map((plan) => ({
    workout_plan_id: plan.id,
    workout_plan_name: plan.name,
  }));
  const newCandidates: SchedulePlanCandidate[] = aiTemplates.map((template) => ({
    workout_plan_name: template.name,
    generated_plan: template,
  }));

  const sessionsPerWeek =
    parsed.weekdays && parsed.weekdays.length > 0
      ? parsed.weekdays.length
      : parsed.sessions_per_week;
  const targetCount = clamp(sessionsPerWeek, 2, 3);

  let seedPlans: SchedulePlanCandidate[] = [];
  if (
    mode === "mix_existing_new" &&
    sourcePlansForExisting.length > 0 &&
    aiTemplates.length > 0
  ) {
    const mixedTemplates = await buildMixedTemplatesFromExistingAndAI(
      supabase,
      userId,
      sourcePlansForExisting,
      aiTemplates,
      targetCount,
    );
    seedPlans = mixedTemplates.map((template) => ({
      workout_plan_name: template.name,
      generated_plan: template,
    }));
  }

  if (seedPlans.length === 0) {
    seedPlans = pickSeedPlansForProgram(
      mode,
      sessionsPerWeek,
      mixRatio,
      existingCandidates,
      newCandidates,
    );
  }

  if (seedPlans.length === 0) {
    throw new ServiceError(
      "CONFLICT",
      "Nie udało się zbudować programu. Dodaj plan treningowy lub doprecyzuj cel.",
    );
  }
  const sessions = generateProgramSchedule(
    seedPlans,
    parsed.duration_months,
    sessionsPerWeek,
    parsed.weekdays,
  );
  const weeksCount = getWeeksCount(parsed.duration_months);
  const interpretedGoalText = buildInterpretedGoalText(
    parsed.goal_text,
    parsed.constraints ?? null,
  );

  return {
    program: {
      name: buildProgramNameFromInterpretation(interpretedGoalText),
      goal_text: interpretedGoalText,
      duration_months: parsed.duration_months,
      weeks_count: weeksCount,
      sessions_per_week: sessionsPerWeek,
      program_mode: mode,
      mix_ratio: mode === "mix_existing_new" ? mixRatio : mode === "new_only" ? 0 : 100,
      source: "ai",
      status: "draft",
      coach_profile_snapshot: {
        profile_id: coachProfile.id,
        persona_name: coachProfile.persona_name,
        tone: coachProfile.tone,
        strictness: coachProfile.strictness,
        verbosity: coachProfile.verbosity,
        focus: coachProfile.focus,
        risk_tolerance: coachProfile.risk_tolerance,
        contraindications: coachProfile.contraindications,
        preferred_methodology: coachProfile.preferred_methodology,
        rules: coachProfile.rules,
        original_goal_text: parsed.goal_text,
        program_mode: mode,
        mix_ratio: mode === "mix_existing_new" ? mixRatio : null,
        constraints: parsed.constraints ?? null,
      },
    },
    sessions,
    recommendations: buildRecommendations(
      weeksCount,
      sessionsPerWeek,
      seedPlans,
      mode,
      mixRatio,
    ),
  };
}

export async function createTrainingProgramService(
  userId: string,
  payload: unknown,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(programCreateSchema, payload);
  const supabase = await createClient();

  const weeksCount = getWeeksCount(parsed.duration_months);

  const { data: insertedProgram, error: insertProgramError } =
    await insertTrainingProgram(supabase, userId, {
      name: parsed.name,
      goal_text: parsed.goal_text ?? null,
      duration_months: parsed.duration_months,
      weeks_count: weeksCount,
      sessions_per_week: parsed.sessions_per_week,
      status: parsed.status,
      source: parsed.source,
      coach_profile_snapshot: (parsed.coach_profile_snapshot ?? null) as Json | null,
    });

  if (insertProgramError) throw mapDbError(insertProgramError);
  if (!insertedProgram) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć programu treningowego.");
  }

  const { resolvedSessions, createdPlanIds } = await createPlansFromGeneratedTemplates(
    userId,
    parsed.name,
    parsed.sessions,
  );
  const sessionsForInsert =
    parsed.source === "ai"
      ? await cloneReferencedPlansForProgram(
          userId,
          parsed.name,
          resolvedSessions,
          createdPlanIds,
        )
      : resolvedSessions;

  const { data: insertedSessions, error: insertSessionsError } =
    await insertProgramSessions(
      supabase,
      userId,
      insertedProgram.id,
      sessionsForInsert.map((session) => ({
        ...session,
        status: session.status,
      })),
    );

  if (insertSessionsError) throw mapDbError(insertSessionsError);

  return {
    ...insertedProgram,
    sessions: insertedSessions ?? [],
  };
}

export async function listTrainingProgramsService(
  userId: string,
  query: ProgramListQueryParams,
): Promise<{ items: TrainingProgramDTO[] }> {
  assertUser(userId);
  const parsed = parseOrThrow(programListQuerySchema, {
    ...query,
    limit: query.limit ?? 30,
  });
  const supabase = await createClient();

  const { data, error } = await listTrainingProgramsByUserId(supabase, userId, parsed);
  if (error) throw mapDbError(error);

  const items = await Promise.all(
    (data ?? []).map(async (program) => {
      const detailed = await getProgramWithSessions(userId, program.id);
      return detailed;
    }),
  );

  return { items };
}

export async function getTrainingProgramService(
  userId: string,
  id: string,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  return await getProgramWithSessions(userId, id);
}

export async function patchTrainingProgramService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<TrainingProgramDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(programUpdateSchema, payload);
  const supabase = await createClient();

  const patch: ProgramUpdateCommand & { weeks_count?: number } = {
    ...parsed,
  };
  if (parsed.duration_months) {
    patch.duration_months = parsed.duration_months;
    patch.weeks_count = getWeeksCount(parsed.duration_months);
  }

  const { data: updated, error } = await updateTrainingProgramById(
    supabase,
    userId,
    id,
    patch,
  );

  if (error) throw mapDbError(error);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  return await getProgramWithSessions(userId, updated.id);
}

export async function listProgramSessionsService(
  userId: string,
  query: ProgramSessionListQueryParams,
): Promise<{ items: Array<TrainingProgramDTO["sessions"][number]> }> {
  assertUser(userId);
  const parsed = parseOrThrow(programSessionListQuerySchema, query);
  const supabase = await createClient();

  const { data, error } = await listProgramSessionsByUserId(supabase, userId, parsed);
  if (error) throw mapDbError(error);

  return { items: data ?? [] };
}

export async function patchProgramSessionService(
  userId: string,
  id: string,
  payload: unknown,
): Promise<TrainingProgramDTO["sessions"][number]> {
  assertUser(userId);
  const parsed = parseOrThrow(programSessionUpdateSchema, payload);
  const supabase = await createClient();

  const { data: updated, error } = await updateProgramSessionById(
    supabase,
    userId,
    id,
    parsed,
  );
  if (error) throw mapDbError(error);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
  }

  return updated;
}

export async function startProgramSessionService(
  userId: string,
  id: string,
): Promise<{
  program_session: TrainingProgramDTO["sessions"][number];
  workout_session: Awaited<ReturnType<typeof startWorkoutSessionService>>["session"];
  is_new_session: boolean;
}> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: programSession, error: fetchError } = await findProgramSessionById(
    supabase,
    userId,
    id,
  );
  if (fetchError) throw mapDbError(fetchError);
  if (!programSession) {
    throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
  }

  const { session, isNew } = await startWorkoutSessionService(userId, {
    workout_plan_id: programSession.workout_plan_id,
  });

  const { data: linked, error: linkError } = await linkProgramSessionToWorkoutSession(
    supabase,
    userId,
    programSession.id,
    session.id,
  );
  if (linkError) throw mapDbError(linkError);
  if (!linked) {
    throw new ServiceError("INTERNAL", "Nie udało się podpiąć sesji programu do sesji treningowej.");
  }

  return {
    program_session: linked,
    workout_session: session,
    is_new_session: isNew,
  };
}

export async function deleteTrainingProgramService(
  userId: string,
  id: string,
): Promise<void> {
  assertUser(userId);
  const supabase = await createClient();

  const { data: program, error: programError } = await findTrainingProgramById(
    supabase,
    userId,
    id,
  );
  if (programError) throw mapDbError(programError);
  if (!program) {
    throw new ServiceError("NOT_FOUND", "Program treningowy nie został znaleziony.");
  }

  const { data: sessions, error: sessionsError } = await listProgramSessionsByProgramId(
    supabase,
    userId,
    id,
  );
  if (sessionsError) throw mapDbError(sessionsError);

  const programPlanIds = Array.from(
    new Set((sessions ?? []).map((session) => session.workout_plan_id)),
  );

  const { error: deleteProgramError } = await deleteTrainingProgramById(
    supabase,
    userId,
    id,
  );
  if (deleteProgramError) throw mapDbError(deleteProgramError);

  if (program.source !== "ai") return;

  const generatedDescription = `Plan wygenerowany dla programu: ${program.name}`;
  for (const planId of programPlanIds) {
    const { data: plan, error: planError } = await findWorkoutPlanById(
      supabase,
      userId,
      planId,
    );
    if (planError) throw mapDbError(planError);
    if (!plan) continue;

    const looksLikeGeneratedProgramPlan =
      (plan.description ?? "") === generatedDescription ||
      plan.name.startsWith(`${program.name} · Sesja`);
    if (!looksLikeGeneratedProgramPlan) {
      continue;
    }

    const { count, error: refCountError } = await supabase
      .from("program_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("workout_plan_id", planId);
    if (refCountError) throw mapDbError(refCountError);

    if ((count ?? 0) === 0) {
      const { error: deletePlanError } = await supabase
        .from("workout_plans")
        .delete()
        .eq("user_id", userId)
        .eq("id", planId);
      if (deletePlanError) throw mapDbError(deletePlanError);
    }
  }
}
