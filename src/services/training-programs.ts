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
  generatedPlanTemplatesSchema,
  programGenerateSchema,
  programNoteCreateSchema,
  programNoteListQuerySchema,
  programListQuerySchema,
  programSessionListQuerySchema,
  programSessionUpdateSchema,
  programUpdateSchema,
} from "@/lib/validation/training-programs";
import {
  normalizeTitle,
  normalizeTitleForDbLookup,
} from "@/lib/validation/exercises";
import {
  deleteTrainingProgramById,
  findTrainingProgramById,
  findProgramSessionById,
  insertProgramSessions,
  insertTrainingProgram,
  linkProgramSessionToWorkoutSession,
  listProgramSessionsByUserId,
  listProgramSessionsByProgramId,
  listProgramNotesByProgramId,
  listTrainingProgramsByUserId,
  listWorkoutPlansForProgramGeneration,
  insertProgramNote,
  updateProgramSessionById,
  updateTrainingProgramById,
} from "@/repositories/training-programs";
import {
  insertAIPlanDecision,
  updateAIPlanDecisionById,
} from "@/repositories/ai-plan-decisions";
import {
  findWorkoutPlanById,
  insertWorkoutPlan,
  insertWorkoutPlanExercises,
  listWorkoutPlanExercises,
  updateWorkoutPlan,
} from "@/repositories/workout-plans";
import { getOrCreateAICoachProfileService } from "@/services/ai-coach-profiles";
import { applyCapabilityFeedbackSignal } from "@/services/capability-profiles";
import {
  getWorkoutSessionService,
  startWorkoutSessionService,
} from "@/services/workout-sessions";
import { buildTrainingStateSnapshotService } from "@/services/training-state";
import { getOpenAIClient } from "@/lib/openai";
import { calculatePlanEstimatedTotalTimeSeconds } from "@/lib/workout-plans/estimated-time";
import {
  buildDefaultExercisePrescriptionConfig,
  resolveExercisePrescriptionConfig,
  type ExercisePrescriptionConfig,
} from "@/lib/training/exercise-prescription";
import {
  buildExerciseTitleAliases,
  resolveExerciseLibraryMatch,
} from "@/lib/training/exercise-title-aliases";
import { inferMovementKey } from "@/lib/training/movement-keys";
import {
  createProgramPlannerProposal,
  type ProgramPlannerProposal,
} from "@/lib/training/program-planner-contract";
import {
  validateProgramTemplates,
  type ProgramPlanValidationResult,
} from "@/lib/training/program-plan-validator";
import {
  repairProgramTemplates,
  type ProgramPlanRepairLog,
} from "@/lib/training/program-plan-repairer";
import {
  scoreProgramTemplatesRealism,
  type ProgramPlanRealismScore,
} from "@/lib/training/program-plan-realism";
import type {
  ExercisePart,
  ExerciseType,
  ProgramListQueryParams,
  ProgramGeneratedPlanTemplate,
  ProgramNoteCreateCommand,
  ProgramNoteDTO,
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

type ExerciseLibraryPreview = {
  id: string;
  title: string;
  title_normalized: string;
};

type ExerciseLibraryAliasEntry = {
  id: string;
  title: string;
  aliases: string[];
};

const AI_PROGRAM_WEEKLY_LIMIT = 15;

function isLocalhostHost(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").toLowerCase().trim();
  return (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("[::1]") ||
    host === "::1"
  );
}

function isProgramGenerationLimitEnforced(hostname?: string | null): boolean {
  if (process.env.DISABLE_AI_LIMITS === "1") return false;
  return !isLocalhostHost(hostname);
}

function getCurrentWeekStartIso(date = new Date()): string {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + offset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

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
  decision_log_id: string | null;
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
  guardrail_events: ProgramGuardrailEvent[];
  planner_proposal: ProgramPlannerProposal;
  validation: ProgramPlanValidationResult;
  repair_log: ProgramPlanRepairLog[];
  realism: ProgramPlanRealismScore;
  training_state: {
    readiness_score: number;
    readiness_drivers: string[];
    external_workouts_last_7d: number;
    external_duration_minutes_last_7d: number;
    fatigue_notes_last_14d: number;
  };
};

export type ProgramGuardrailEvent = {
  template_key: string;
  workout_plan_name: string;
  exercise_title: string;
  field:
    | "planned_sets"
    | "planned_reps"
    | "planned_duration_seconds"
    | "planned_rest_seconds";
  from: number;
  to: number;
  reason_code:
    | "exercise_min"
    | "exercise_max"
    | "main_workout_min"
    | "main_workout_max"
    | "capability_limit"
    | "readiness_downscale";
  reason: string;
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

function buildProgramName(goalText: string, constraints?: string | null): string {
  const text = `${goalText} ${constraints ?? ""}`.toLowerCase();
  const labels: string[] = [];

  if (/\bl-?sit\b|kompres|unoszen|zginacz/.test(text)) {
    labels.push("L-Sit i Kompresja");
  }
  if (/handstand|stanie na ręk|pike/.test(text)) {
    labels.push("Handstand");
  }
  if (/pole|poledance|handspring|shouldermount/.test(text)) {
    labels.push("Pole Strength");
  }
  if (/bark/.test(text) && !labels.includes("Handstand")) {
    labels.push("Barki i Stabilizacja");
  }
  if (/core|brzuch|stabiliz/.test(text) && !labels.includes("L-Sit i Kompresja")) {
    labels.push("Core i Stabilizacja");
  }
  if (/mobil|rozciag|stretch/.test(text)) {
    labels.push("Mobilność");
  }
  if (/kontuz|ból|bol|przeciąż|przeciaz|kolano/.test(text)) {
    labels.push("Powrót Bez Przeciążeń");
  }
  if (/sił|sila|strength/.test(text) && labels.length === 0) {
    labels.push("Siła Bazowa");
  }

  const uniqueLabels = Array.from(new Set(labels)).slice(0, 2);
  if (uniqueLabels.length > 0) {
    return uniqueLabels.join(" · ");
  }

  return "Plan Treningowy";
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

async function generateProgramTemplatesWithLLM(params: {
  goalText: string;
  constraints?: string | null;
  sessionsPerWeek: number;
  mode: ProgramGenerationMode;
  readinessScore: number;
  readinessDrivers: string[];
  externalWorkoutsLast7d: number;
  topMovementKeys: string[];
  libraryExerciseTitles: string[];
  coachProfile: {
    persona_name: string;
    focus: string | null;
    risk_tolerance: string | null;
    preferred_methodology: string | null;
  };
}): Promise<{
  templates: ProgramGeneratedPlanTemplate[];
  rationale: string[];
  assumptions: string[];
  sourceLabel: string;
} | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const model =
    process.env.OPENAI_PROGRAM_PLANNER_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1";
  const openai = getOpenAIClient();
  const readinessDrivers =
    params.readinessDrivers.length > 0
      ? params.readinessDrivers.join(", ")
      : "brak istotnych sygnałów";
  const topMovementKeys =
    params.topMovementKeys.length > 0 ? params.topMovementKeys.join(", ") : "brak";
  const libraryExerciseTitles =
    params.libraryExerciseTitles.length > 0
      ? params.libraryExerciseTitles.slice(0, 80).join(", ")
      : "brak";
  const prompt = [
    "Zwróć wyłącznie poprawny JSON bez markdownu.",
    "Tworzysz 1-3 szablony jednostek treningowych dla programu treningowego.",
    "Każdy szablon musi zawierać warm-up, 2-5 ćwiczeń main workout i cool-down.",
    "Używaj realistycznych zakresów:",
    "- izometrie zwykle 10-45 s",
    "- główne ćwiczenia zwykle 2-6 serii",
    "- rest zwykle 30-120 s",
    "Nie przekraczaj konserwatywnej objętości, jeśli readiness jest niskie.",
    "Dla każdego ćwiczenia podaj albo planned_reps, albo planned_duration_seconds. Nie obu naraz.",
    "Dozwolone section_type i exercise_type: Warm-up, Main Workout, Cool-down.",
    "Dozwolone exercise_part: Arms, Legs, Back, Core, Full Body.",
    "",
    "Zwróć tablicę JSON szablonów o polach:",
    "template_key, name, description, part, exercises[].",
    "Każde exercises[] ma pola:",
    "section_type, section_order, exercise_title, exercise_type, exercise_part, exercise_details, planned_sets, planned_reps, planned_duration_seconds, planned_rest_seconds.",
    "",
    "Kontekst:",
    `goal_text: ${params.goalText}`,
    `constraints: ${params.constraints ?? "brak"}`,
    `mode: ${params.mode}`,
    `sessions_per_week: ${params.sessionsPerWeek}`,
    `readiness_score: ${params.readinessScore}/100`,
    `readiness_drivers: ${readinessDrivers}`,
    `external_workouts_last_7d: ${params.externalWorkoutsLast7d}`,
    `top_movement_keys: ${topMovementKeys}`,
    `exercise_library_titles: ${libraryExerciseTitles}`,
    `coach_persona: ${params.coachProfile.persona_name}`,
    `coach_focus: ${params.coachProfile.focus ?? "brak"}`,
    `coach_risk_tolerance: ${params.coachProfile.risk_tolerance ?? "brak"}`,
    `coach_methodology: ${params.coachProfile.preferred_methodology ?? "brak"}`,
  ].join("\n");

  const runPlannerAttempt = async (extraInstruction?: string) => {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Jesteś systemem planowania treningowego. Tworzysz tylko realistyczne propozycje treningowe w JSON. Nie zwracasz tekstu objaśniającego.",
        },
        {
          role: "user",
          content: extraInstruction ? `${prompt}\n\n${extraInstruction}` : prompt,
        },
      ],
    });

    const text = response.output_text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text);
    const result = generatedPlanTemplatesSchema.safeParse(parsed);
    return result.success ? result.data : null;
  };

  try {
    const firstAttempt = await runPlannerAttempt();
    const secondAttempt =
      firstAttempt ??
      (await runPlannerAttempt(
        "Popraw format. Zwróć wyłącznie tablicę JSON 1-3 template'ów, bez komentarzy, bez markdownu, bez dodatkowych pól.",
      ));
    if (!secondAttempt) {
      return null;
    }

    return {
      templates: secondAttempt,
      rationale: [
        `Planner LLM użył modelu ${model}.`,
        `Proposal uwzględniał readiness ${params.readinessScore}/100 i external load z 7 dni.`,
      ],
      assumptions: [
        "Proposal z LLM jest tylko kandydatem i przechodzi lokalną walidację oraz repair.",
      ],
      sourceLabel: "llm",
    };
  } catch {
    return null;
  }
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
  exercise_prescription_config?: ExercisePrescriptionConfig | null;
};

const TARGET_PLAN_MIN_SECONDS = 50 * 60;
const TARGET_PLAN_MAX_SECONDS = 60 * 60;
const TARGET_WARMUP_MIN_SECONDS = 8 * 60;
const TARGET_COOLDOWN_MIN_SECONDS = 5 * 60;
const MAIN_WORKOUT_MIN_SETS = 1;
const MAIN_WORKOUT_MAX_SETS = 6;
const MAIN_WORKOUT_MIN_REPS = 5;
const MAIN_WORKOUT_MAX_REPS = 30;
const MAIN_WORKOUT_MIN_DURATION_SECONDS = 10;
const MAIN_WORKOUT_MAX_DURATION_DYNAMIC_SECONDS = 120;
const MAIN_WORKOUT_MAX_DURATION_ISOMETRIC_SECONDS = 45;
const MAIN_WORKOUT_MIN_REST_SECONDS = 30;
const MAIN_WORKOUT_MAX_REST_SECONDS = 180;

function getExercisePrescription(
  exercise: PlanExerciseInsertShape,
): ExercisePrescriptionConfig {
  return resolveExercisePrescriptionConfig({
    title: exercise.exercise_title,
    reps: exercise.planned_reps,
    duration_seconds: exercise.planned_duration_seconds,
    series: exercise.planned_sets,
    rest_in_between_seconds: exercise.planned_rest_seconds,
    prescription_config: exercise.exercise_prescription_config ?? null,
  });
}

function clampMainWorkoutExercisePrescription(
  exercise: PlanExerciseInsertShape,
): ProgramGuardrailEvent[] {
  if (exercise.section_type !== "Main Workout") return [];
  const guardrailEvents: ProgramGuardrailEvent[] = [];
  const prescription = getExercisePrescription(exercise);

  const clampField = (
    field: ProgramGuardrailEvent["field"],
    current: number | null | undefined,
    min: number,
    max: number,
    minReason: ProgramGuardrailEvent["reason_code"],
    maxReason: ProgramGuardrailEvent["reason_code"],
  ): number | null => {
    if (current === null || current === undefined) return null;
    const next = clamp(current, min, max);
    if (next !== current) {
      guardrailEvents.push({
        template_key: "",
        workout_plan_name: "",
        exercise_title: exercise.exercise_title ?? "Ćwiczenie",
        field,
        from: current,
        to: next,
        reason_code: next === min ? minReason : maxReason,
        reason:
          next === min
            ? `Skorygowano do minimalnej wartości guardraila (${min}).`
            : `Skorygowano do maksymalnej wartości guardraila (${max}).`,
      });
    }
    return next;
  };

  exercise.planned_sets = clampField(
    "planned_sets",
    exercise.planned_sets,
    Math.max(MAIN_WORKOUT_MIN_SETS, prescription.min_sets),
    Math.min(MAIN_WORKOUT_MAX_SETS, prescription.max_sets),
    "exercise_min",
    "exercise_max",
  );

  if (prescription.min_reps !== null && prescription.max_reps !== null) {
    exercise.planned_reps = clampField(
      "planned_reps",
      exercise.planned_reps,
      Math.max(MAIN_WORKOUT_MIN_REPS, prescription.min_reps),
      Math.min(MAIN_WORKOUT_MAX_REPS, prescription.max_reps),
      "exercise_min",
      "exercise_max",
    );
  }

  if (
    prescription.min_duration_seconds !== null &&
    prescription.max_duration_seconds !== null
  ) {
    exercise.planned_duration_seconds = clampField(
      "planned_duration_seconds",
      exercise.planned_duration_seconds,
      Math.max(MAIN_WORKOUT_MIN_DURATION_SECONDS, prescription.min_duration_seconds),
      Math.min(
        prescription.max_duration_seconds,
        prescription.prescription_mode === "duration_based_isometric"
          ? MAIN_WORKOUT_MAX_DURATION_ISOMETRIC_SECONDS
          : MAIN_WORKOUT_MAX_DURATION_DYNAMIC_SECONDS,
      ),
      "exercise_min",
      "exercise_max",
    );
  }

  exercise.planned_rest_seconds = clampField(
    "planned_rest_seconds",
    exercise.planned_rest_seconds,
    Math.max(MAIN_WORKOUT_MIN_REST_SECONDS, prescription.min_rest_seconds),
    Math.min(MAIN_WORKOUT_MAX_REST_SECONDS, prescription.max_rest_seconds),
    "exercise_min",
    "exercise_max",
  );

  return guardrailEvents;
}

function sanitizePlanTemplate(
  template: ProgramGeneratedPlanTemplate,
): { template: ProgramGeneratedPlanTemplate; guardrailEvents: ProgramGuardrailEvent[] } {
  const exercises = template.exercises.map((exercise) => ({
    ...exercise,
    exercise_prescription_config: resolveExercisePrescriptionConfig({
      title: exercise.exercise_title,
      reps: exercise.planned_reps ?? null,
      duration_seconds: exercise.planned_duration_seconds ?? null,
      series: exercise.planned_sets ?? null,
      rest_in_between_seconds: exercise.planned_rest_seconds ?? null,
      prescription_config: exercise.exercise_prescription_config ?? null,
    }),
  }));
  const normalized = normalizePlanDuration(
    enforceWarmupCooldownMinutes(
      ensureWarmupAndCooldown(
        exercises.map((exercise) => ({
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
          exercise_prescription_config: resolveExercisePrescriptionConfig({
            title: exercise.exercise_title,
            reps: exercise.planned_reps ?? null,
            duration_seconds: exercise.planned_duration_seconds ?? null,
            series: exercise.planned_sets ?? null,
            rest_in_between_seconds: exercise.planned_rest_seconds ?? null,
            prescription_config: exercise.exercise_prescription_config ?? null,
          }),
        })),
      ),
    ),
  ).map((exercise) => ({
    ...exercise,
    exercise_prescription_config: resolveExercisePrescriptionConfig({
        title: exercise.exercise_title,
        reps: exercise.planned_reps ?? null,
        duration_seconds: exercise.planned_duration_seconds ?? null,
        series: exercise.planned_sets ?? null,
        rest_in_between_seconds: exercise.planned_rest_seconds ?? null,
        prescription_config: exercise.exercise_prescription_config ?? null,
      }),
  }));

  const guardrailEvents: ProgramGuardrailEvent[] = [];
  normalized.forEach((exercise, index) => {
    const source = template.exercises[index];
    if (!source) return;

    const comparableFields: Array<ProgramGuardrailEvent["field"]> = [
      "planned_sets",
      "planned_reps",
      "planned_duration_seconds",
      "planned_rest_seconds",
    ];

    for (const field of comparableFields) {
      const before = source[field];
      const after = exercise[field];
      if (typeof before !== "number" || typeof after !== "number" || before === after) {
        continue;
      }

      guardrailEvents.push({
        template_key: template.template_key,
        workout_plan_name: template.name,
        exercise_title: exercise.exercise_title ?? source.exercise_title,
        field,
        from: before,
        to: after,
        reason_code: after > before ? "exercise_min" : "exercise_max",
        reason:
          after > before
            ? "Plan został podniesiony do minimalnego bezpiecznego zakresu dla ćwiczenia."
            : "Plan został obniżony do maksymalnego bezpiecznego zakresu dla ćwiczenia.",
      });
    }
  });

  return {
    template: {
      ...template,
      exercises: normalized.map((exercise, index) => ({
        exercise_id: exercise.exercise_id ?? null,
        section_type: exercise.section_type,
        section_order: index + 1,
        exercise_title: exercise.exercise_title ?? "Ćwiczenie",
        exercise_type: exercise.exercise_type ?? exercise.section_type,
        exercise_part: exercise.exercise_part ?? template.part ?? null,
        exercise_details: exercise.exercise_details ?? null,
        exercise_is_unilateral: exercise.exercise_is_unilateral ?? null,
        planned_sets: exercise.planned_sets ?? null,
        planned_reps: exercise.planned_reps ?? null,
        planned_duration_seconds: exercise.planned_duration_seconds ?? null,
        planned_rest_seconds: exercise.planned_rest_seconds ?? null,
        planned_rest_after_series_seconds:
          exercise.planned_rest_after_series_seconds ?? null,
        estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
        exercise_prescription_config:
          exercise.exercise_prescription_config ?? null,
      })),
    },
    guardrailEvents,
  };
}

function sanitizeSchedulePlanCandidates(
  candidates: SchedulePlanCandidate[],
): {
  candidates: SchedulePlanCandidate[];
  guardrailEvents: ProgramGuardrailEvent[];
} {
  const guardrailEvents: ProgramGuardrailEvent[] = [];

  const sanitizedCandidates = candidates.map((candidate) => {
    if (!candidate.generated_plan) return candidate;

    const sanitized = sanitizePlanTemplate(candidate.generated_plan);
    guardrailEvents.push(...sanitized.guardrailEvents);

    return {
      ...candidate,
      workout_plan_name: sanitized.template.name,
      generated_plan: sanitized.template,
    };
  });

  return { candidates: sanitizedCandidates, guardrailEvents };
}

function applyCapabilityCapsToCandidates(
  candidates: SchedulePlanCandidate[],
  trainingState: Awaited<ReturnType<typeof buildTrainingStateSnapshotService>>,
): {
  candidates: SchedulePlanCandidate[];
  guardrailEvents: ProgramGuardrailEvent[];
} {
  const events: ProgramGuardrailEvent[] = [];

  const cappedCandidates = candidates.map((candidate) => {
    if (!candidate.generated_plan) return candidate;

    const nextExercises = candidate.generated_plan.exercises.map((exercise) => {
      const movementKey = inferMovementKey({
        title: exercise.exercise_title,
        part: exercise.exercise_part ?? candidate.generated_plan?.part ?? null,
      });
      const capability = trainingState.capability_summary.find(
        (item) => item.movement_key === movementKey,
      );
      if (!capability) return exercise;

      const next = { ...exercise };
      const title = exercise.exercise_title;

      if (
        typeof next.planned_reps === "number" &&
        typeof capability.comfort_max_reps === "number"
      ) {
        const cap = Math.max(
          capability.comfort_max_reps,
          capability.comfort_max_reps + 1,
        );
        if (next.planned_reps > cap) {
          events.push({
            template_key: candidate.generated_plan!.template_key,
            workout_plan_name: candidate.generated_plan!.name,
            exercise_title: title,
            field: "planned_reps",
            from: next.planned_reps,
            to: cap,
            reason_code: "capability_limit",
            reason: `Zastosowano limit możliwości dla wzorca ${movementKey}.`,
          });
          next.planned_reps = cap;
        }
      }

      if (
        typeof next.planned_duration_seconds === "number" &&
        typeof capability.comfort_max_duration_seconds === "number"
      ) {
        const cap = Math.max(
          capability.comfort_max_duration_seconds,
          Math.floor(capability.comfort_max_duration_seconds * 1.15),
        );
        if (next.planned_duration_seconds > cap) {
          events.push({
            template_key: candidate.generated_plan!.template_key,
            workout_plan_name: candidate.generated_plan!.name,
            exercise_title: title,
            field: "planned_duration_seconds",
            from: next.planned_duration_seconds,
            to: cap,
            reason_code: "capability_limit",
            reason: `Zastosowano limit możliwości dla wzorca ${movementKey}.`,
          });
          next.planned_duration_seconds = cap;
        }
      }

      if (capability.pain_flag && typeof next.planned_sets === "number") {
        const nextSets = Math.max(1, next.planned_sets - 1);
        if (nextSets !== next.planned_sets) {
          events.push({
            template_key: candidate.generated_plan!.template_key,
            workout_plan_name: candidate.generated_plan!.name,
            exercise_title: title,
            field: "planned_sets",
            from: next.planned_sets,
            to: nextSets,
            reason_code: "capability_limit",
            reason: `Obniżono objętość z powodu aktywnej flagi bólowej dla wzorca ${movementKey}.`,
          });
          next.planned_sets = nextSets;
        }
      }

      return next;
    });

    return {
      ...candidate,
      generated_plan: {
        ...candidate.generated_plan,
        exercises: nextExercises,
      },
    };
  });

  return { candidates: cappedCandidates, guardrailEvents: events };
}

function clonePlanExercises(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  return exercises.map((exercise) => ({ ...exercise }));
}

function getCycledItem<T>(items: T[], index: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[index % items.length];
}

function increaseMainExerciseVolume(exercise: PlanExerciseInsertShape): void {
  const prescription = getExercisePrescription(exercise);

  if (
    exercise.planned_reps &&
    exercise.planned_reps > 0 &&
    prescription.max_reps !== null
  ) {
    exercise.planned_reps = Math.min(
      prescription.max_reps,
      exercise.planned_reps + (prescription.progression_step_reps ?? 1),
    );
    return;
  }

  if (
    exercise.planned_duration_seconds &&
    exercise.planned_duration_seconds > 0 &&
    prescription.max_duration_seconds !== null
  ) {
    exercise.planned_duration_seconds = Math.min(
      prescription.max_duration_seconds,
      exercise.planned_duration_seconds +
        (prescription.progression_step_duration_seconds ?? 3),
    );
    return;
  }

  if (exercise.planned_sets && exercise.planned_sets > 0) {
    exercise.planned_sets = Math.min(prescription.max_sets, exercise.planned_sets + 1);
    return;
  }

  if (
    exercise.planned_rest_seconds &&
    exercise.planned_rest_seconds > 0 &&
    exercise.planned_rest_seconds < prescription.max_rest_seconds
  ) {
    exercise.planned_rest_seconds = Math.min(
      prescription.max_rest_seconds,
      exercise.planned_rest_seconds + 15,
    );
    return;
  }

  exercise.planned_sets = Math.max(prescription.min_sets, exercise.planned_sets ?? 1);
  if (prescription.min_reps !== null) {
    exercise.planned_reps = prescription.min_reps;
    exercise.planned_duration_seconds = null;
    return;
  }
  if (prescription.min_duration_seconds !== null) {
    exercise.planned_duration_seconds = prescription.min_duration_seconds;
    exercise.planned_reps = null;
  }
}

function decreaseMainExerciseVolume(exercise: PlanExerciseInsertShape): void {
  const prescription = getExercisePrescription(exercise);

  if (
    exercise.planned_rest_seconds &&
    exercise.planned_rest_seconds > prescription.min_rest_seconds
  ) {
    exercise.planned_rest_seconds = Math.max(
      prescription.min_rest_seconds,
      exercise.planned_rest_seconds - 15,
    );
    return;
  }

  if (exercise.planned_sets && exercise.planned_sets > prescription.min_sets) {
    exercise.planned_sets = Math.max(prescription.min_sets, exercise.planned_sets - 1);
    return;
  }

  if (
    exercise.planned_reps &&
    exercise.planned_reps > (prescription.min_reps ?? MAIN_WORKOUT_MIN_REPS)
  ) {
    exercise.planned_reps = Math.max(
      prescription.min_reps ?? MAIN_WORKOUT_MIN_REPS,
      exercise.planned_reps - (prescription.progression_step_reps ?? 1),
    );
    return;
  }

  if (
    exercise.planned_duration_seconds &&
    exercise.planned_duration_seconds >
      (prescription.min_duration_seconds ?? MAIN_WORKOUT_MIN_DURATION_SECONDS)
  ) {
    exercise.planned_duration_seconds = Math.max(
      prescription.min_duration_seconds ?? MAIN_WORKOUT_MIN_DURATION_SECONDS,
      exercise.planned_duration_seconds -
        (prescription.progression_step_duration_seconds ?? 3),
    );
  }
}

function increaseDurationToMinimum(
  normalized: PlanExerciseInsertShape[],
  mainWorkoutIndexes: number[],
  initialEstimate: number,
): number {
  let estimated = initialEstimate;
  let cursor = 0;
  let guard = 0;

  while (estimated < TARGET_PLAN_MIN_SECONDS && guard < 500) {
    const index = getCycledItem(mainWorkoutIndexes, cursor);
    if (index === undefined) break;
    const exercise = normalized[index];
    if (!exercise) break;

    increaseMainExerciseVolume(exercise);
    estimated = calculatePlanEstimatedTotalTimeSeconds(normalized) ?? 0;
    cursor += 1;
    guard += 1;
  }

  return estimated;
}

function decreaseDurationToMaximum(
  normalized: PlanExerciseInsertShape[],
  mainWorkoutIndexes: number[],
  initialEstimate: number,
): number {
  let estimated = initialEstimate;
  let cursor = 0;
  let guard = 0;

  while (estimated > TARGET_PLAN_MAX_SECONDS && guard < 500) {
    const index = getCycledItem(mainWorkoutIndexes, cursor);
    if (index === undefined) break;
    const exercise = normalized[index];
    if (!exercise) break;

    decreaseMainExerciseVolume(exercise);
    estimated = calculatePlanEstimatedTotalTimeSeconds(normalized) ?? 0;
    cursor += 1;
    guard += 1;
  }

  return estimated;
}

function normalizePlanDuration(
  exercises: PlanExerciseInsertShape[],
): PlanExerciseInsertShape[] {
  const normalized = clonePlanExercises(exercises);
  for (const exercise of normalized) {
    clampMainWorkoutExercisePrescription(exercise);
  }
  const mainWorkoutIndexes = normalized
    .map((exercise, index) =>
      exercise.section_type === "Main Workout" ? index : -1,
    )
    .filter((index) => index >= 0);

  if (mainWorkoutIndexes.length === 0) {
    return normalized;
  }

  const estimated = calculatePlanEstimatedTotalTimeSeconds(normalized) ?? 0;
  const afterIncrease = increaseDurationToMinimum(normalized, mainWorkoutIndexes, estimated);
  decreaseDurationToMaximum(normalized, mainWorkoutIndexes, afterIncrease);

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
    exercise_prescription_config:
      exercise.exercise_prescription_config ?? null,
  };
}

async function loadExerciseLibraryPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit = 120,
): Promise<ExerciseLibraryPreview[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id,title,title_normalized")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return [];
    }
    throw mapDbError(error);
  }

  return (data ?? []) as ExerciseLibraryPreview[];
}

function buildExerciseLibraryAliasEntries(
  libraryExercises: ExerciseLibraryPreview[],
): ExerciseLibraryAliasEntry[] {
  return libraryExercises.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    aliases: buildExerciseTitleAliases(exercise.title),
  }));
}

function buildExerciseLibraryPromptEntries(
  libraryExercises: ExerciseLibraryPreview[],
): string[] {
  return buildExerciseLibraryAliasEntries(libraryExercises).map((exercise) => {
    const aliases = exercise.aliases.filter((alias) => alias !== normalizeTitleForDbLookup(exercise.title));
    return aliases.length > 0
      ? `${exercise.title} | aliasy: ${aliases.slice(0, 3).join(" | ")}`
      : exercise.title;
  });
}

async function attachLibraryExercisesToGeneratedTemplate(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  template: ProgramGeneratedPlanTemplate;
}): Promise<ProgramGeneratedPlanTemplate> {
  const libraryExercises = await loadExerciseLibraryPreview(
    params.supabase,
    params.userId,
  );
  if (libraryExercises.length === 0) {
    return params.template;
  }
  return {
    ...params.template,
    exercises: params.template.exercises.map((exercise) => {
      if (exercise.exercise_id) return exercise;
      const matched = resolveExerciseLibraryMatch(
        exercise.exercise_title,
        libraryExercises,
      );
      if (!matched) return exercise;
      return {
        ...exercise,
        exercise_id: matched.id,
        exercise_title: matched.title,
      };
    }),
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
    const sourcePlan = getCycledItem(existingPlans, i);
    const aiTemplate = getCycledItem(aiTemplates, i);
    if (!sourcePlan || !aiTemplate) continue;

    const sourceExercises = await getCachedSourceExercises(supabase, sourcePlan.id, cache);
    if (sourceExercises.length === 0) continue;

    const existingWarmup = pickExistingSectionExercises(sourceExercises, "Warm-up", 1);
    const existingMain = pickExistingSectionExercises(sourceExercises, "Main Workout", 4);
    const existingCooldown = pickExistingSectionExercises(sourceExercises, "Cool-down", 1);

    const aiWarmup = pickAITemplateSectionExercises(aiTemplate, "Warm-up", 1);
    const aiMain = pickAITemplateSectionExercises(aiTemplate, "Main Workout", 3);
    const aiCooldown = pickAITemplateSectionExercises(aiTemplate, "Cool-down", 1);

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

async function getCachedSourceExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourcePlanId: string,
  cache: Map<string, Awaited<ReturnType<typeof listWorkoutPlanExercises>>["data"]>,
): Promise<WorkoutPlanExerciseDTO[]> {
  const cached = cache.get(sourcePlanId);
  if (cached) return cached;

  const { data, error } = await listWorkoutPlanExercises(supabase, sourcePlanId);
  if (error) throw mapDbError(error);

  const normalized = data ?? [];
  cache.set(sourcePlanId, normalized);
  return normalized;
}

function pickExistingSectionExercises(
  sourceExercises: WorkoutPlanExerciseDTO[],
  section: "Warm-up" | "Main Workout" | "Cool-down",
  limit: number,
): ProgramGeneratedPlanTemplate["exercises"] {
  return sourceExercises
    .filter((exercise) => exercise.section_type === section)
    .slice(0, limit)
    .map(mapPlanExerciseToGeneratedInput);
}

function pickAITemplateSectionExercises(
  template: ProgramGeneratedPlanTemplate,
  section: "Warm-up" | "Main Workout" | "Cool-down",
  limit: number,
): ProgramGeneratedPlanTemplate["exercises"] {
  return template.exercises
    .filter((exercise) => exercise.section_type === section)
    .slice(0, limit)
    .map((exercise) => ({ ...exercise, exercise_id: null }));
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

  const firstWarmupIndex = next.findIndex((exercise) => exercise.section_type === "Warm-up");
  if (firstWarmupIndex >= 0) {
    const firstWarmup = next[firstWarmupIndex];
    if (firstWarmup) {
      const current = firstWarmup.planned_duration_seconds ?? 0;
      if (current < TARGET_WARMUP_MIN_SECONDS) {
        firstWarmup.planned_duration_seconds = TARGET_WARMUP_MIN_SECONDS;
        firstWarmup.planned_sets = 1;
        firstWarmup.planned_reps = null;
      }
    }
  }

  const firstCooldownIndex = next.findIndex((exercise) => exercise.section_type === "Cool-down");
  if (firstCooldownIndex >= 0) {
    const firstCooldown = next[firstCooldownIndex];
    if (firstCooldown) {
      const current = firstCooldown.planned_duration_seconds ?? 0;
      if (current < TARGET_COOLDOWN_MIN_SECONDS) {
        firstCooldown.planned_duration_seconds = TARGET_COOLDOWN_MIN_SECONDS;
        firstCooldown.planned_sets = 1;
        firstCooldown.planned_reps = null;
      }
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

    for (const dayOffset of weekdays) {
      const plan = getCycledItem(plans, sessionIndex - 1);
      if (!plan) continue;
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

type ProgressionOverrides = {
  load_adjustment_percent?: number | null;
  volume_adjustment_percent?: number | null;
  emphasis?: string | null;
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

    const libraryAttachedTemplate = await attachLibraryExercisesToGeneratedTemplate({
      supabase,
      userId,
      template,
    });

    const generatedExercises = normalizePlanDuration(
      enforceWarmupCooldownMinutes(
        ensureWarmupAndCooldown(
      libraryAttachedTemplate.exercises.map((exercise) => ({
        exercise_id: exercise.exercise_id ?? null,
        snapshot_id: null,
        scope_id: null,
        in_scope_nr: null,
        scope_repeat_count: null,
        exercise_title: exercise.exercise_title,
        exercise_type: exercise.exercise_type ?? exercise.section_type,
        exercise_part: exercise.exercise_part ?? libraryAttachedTemplate.part ?? null,
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
        exercise_prescription_config:
          exercise.exercise_prescription_config ?? null,
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

  for (const [idx, sourcePlanId] of uniqueSourcePlanIds.entries()) {
    if (skipClonePlanIds?.has(sourcePlanId)) {
      clonedPlanIdBySourceId.set(sourcePlanId, sourcePlanId);
      continue;
    }
    const { clonedPlanId, sourceName } = await cloneProgramSourcePlan({
      supabase,
      userId,
      sourcePlanId,
      programName,
      sessionIndex: idx + 1,
      isSingleSource: uniqueSourcePlanIds.length === 1,
    });

    clonedPlanIdBySourceId.set(sourcePlanId, clonedPlanId);
    sourceNameById.set(sourcePlanId, sourceName);
  }

  return sessions.map((session) => {
    const clonedId = clonedPlanIdBySourceId.get(session.workout_plan_id);
    const sourceName = sourceNameById.get(session.workout_plan_id);
    const includeWorkoutPlanName = session.workout_plan_name !== undefined;
    if (!clonedId) return session;
    return {
      ...session,
      workout_plan_id: clonedId,
      ...(includeWorkoutPlanName
        ? { workout_plan_name: sourceName ?? session.workout_plan_name }
        : {}),
    };
  });
}

async function cloneProgramSourcePlan(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  sourcePlanId: string;
  programName: string;
  sessionIndex: number;
  isSingleSource: boolean;
}): Promise<{ clonedPlanId: string; sourceName: string }> {
  const { supabase, userId, sourcePlanId, programName, sessionIndex, isSingleSource } = params;
  const { data: sourcePlan, error: sourcePlanError } = await findWorkoutPlanById(
    supabase,
    userId,
    sourcePlanId,
  );
  if (sourcePlanError) throw mapDbError(sourcePlanError);
  if (!sourcePlan) {
    throw new ServiceError("NOT_FOUND", "Nie znaleziono planu źródłowego dla programu.");
  }

  const { data: sourceExercises, error: sourceExercisesError } = await listWorkoutPlanExercises(
    supabase,
    sourcePlanId,
  );
  if (sourceExercisesError) throw mapDbError(sourceExercisesError);
  if (!sourceExercises || sourceExercises.length === 0) {
    throw new ServiceError(
      "CONFLICT",
      "Plan źródłowy nie zawiera ćwiczeń. Nie można utworzyć programu.",
    );
  }

  const clonedPlanName = isSingleSource
    ? `${programName} · Sesja`
    : `${programName} · Sesja ${sessionIndex}`;
  const { data: insertedPlan, error: insertPlanError } = await insertWorkoutPlan(supabase, userId, {
    name: clonedPlanName,
    description: `Plan wygenerowany dla programu: ${programName}`,
    part: sourcePlan.part,
    estimated_total_time_seconds: sourcePlan.estimated_total_time_seconds ?? null,
  });
  if (insertPlanError) throw mapDbError(insertPlanError);
  if (!insertedPlan) {
    throw new ServiceError("INTERNAL", "Nie udało się utworzyć planu dla programu.");
  }

  const sourceMappedExercises: PlanExerciseInsertShape[] = sourceExercises.map((exercise) => ({
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
    planned_rest_after_series_seconds: exercise.planned_rest_after_series_seconds ?? null,
    estimated_set_time_seconds: exercise.estimated_set_time_seconds ?? null,
    exercise_prescription_config: exercise.exercise_prescription_config ?? null,
  }));
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
  const { error: updateEstimatedTimeError } = await updateWorkoutPlan(supabase, userId, insertedPlan.id, {
    estimated_total_time_seconds: estimatedTotalTime,
  });
  if (updateEstimatedTimeError) throw mapDbError(updateEstimatedTimeError);

  return {
    clonedPlanId: insertedPlan.id,
    sourceName: sourcePlan.name,
  };
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

function parseProgressionOverrides(value: unknown): ProgressionOverrides {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  return {
    load_adjustment_percent:
      typeof obj.load_adjustment_percent === "number"
        ? clamp(obj.load_adjustment_percent, -30, 40)
        : null,
    volume_adjustment_percent:
      typeof obj.volume_adjustment_percent === "number"
        ? clamp(obj.volume_adjustment_percent, -30, 40)
        : null,
    emphasis: typeof obj.emphasis === "string" ? obj.emphasis : null,
  };
}

function adjustSessionValue(
  baseValue: number | null,
  adjustmentPercent: number | null | undefined,
  minValue = 1,
  maxValue?: number,
): number | null {
  if (baseValue === null) return null;
  if (!adjustmentPercent) return baseValue;
  const factor = 1 + adjustmentPercent / 100;
  const rounded =
    adjustmentPercent > 0 ? Math.ceil(baseValue * factor) : Math.floor(baseValue * factor);
  const minClamped = Math.max(minValue, rounded);
  if (typeof maxValue === "number") {
    return Math.min(maxValue, minClamped);
  }
  return minClamped;
}

function isMissingProgramNotesTableError(error: { code?: string; message?: string }): boolean {
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = (error.message ?? "").toLowerCase();
  return message.includes("program_notes");
}

async function applyProgramProgressionToStartedSession(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workoutSessionId: string;
  progressionOverrides: unknown;
}): Promise<void> {
  const { supabase, workoutSessionId, progressionOverrides } = params;
  const parsed = parseProgressionOverrides(progressionOverrides);
  const volumePct = parsed.volume_adjustment_percent ?? 0;
  if (volumePct === 0) return;

  const { data: sessionExercises, error: sessionExercisesError } = await supabase
    .from("workout_session_exercises")
    .select(
      "id,exercise_type_at_time,exercise_title_at_time,planned_sets,planned_reps,planned_duration_seconds,planned_rest_seconds",
    )
    .eq("session_id", workoutSessionId)
    .order("exercise_order", { ascending: true });
  if (sessionExercisesError) throw mapDbError(sessionExercisesError);
  if (!sessionExercises || sessionExercises.length === 0) return;

  for (const exercise of sessionExercises) {
    // Progression only for main section; leave warm-up/cool-down untouched.
    if (exercise.exercise_type_at_time !== "Main Workout") continue;

    const updatePayload = buildSessionExerciseProgressionUpdate(exercise, volumePct);
    const { error: updateExerciseError } = await supabase
      .from("workout_session_exercises")
      .update(updatePayload)
      .eq("id", exercise.id);
    if (updateExerciseError) throw mapDbError(updateExerciseError);
  }
}

function buildSessionExerciseProgressionUpdate(
  exercise: {
    exercise_title_at_time: string;
    planned_sets: number | null;
    planned_reps: number | null;
    planned_duration_seconds: number | null;
    planned_rest_seconds: number | null;
  },
  volumePct: number,
): {
  planned_sets: number | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
} {
  const hasReps = exercise.planned_reps !== null;
  const hasDuration = !hasReps && exercise.planned_duration_seconds !== null;
  const hasSets = !hasReps && !hasDuration && exercise.planned_sets !== null;
  const prescription = buildDefaultExercisePrescriptionConfig({
    title: exercise.exercise_title_at_time,
    reps: exercise.planned_reps,
    duration_seconds: exercise.planned_duration_seconds,
    series: exercise.planned_sets,
    rest_in_between_seconds: exercise.planned_rest_seconds,
  });
  const durationMax =
    prescription.max_duration_seconds ??
    MAIN_WORKOUT_MAX_DURATION_DYNAMIC_SECONDS;

  return {
    planned_sets: hasSets
      ? adjustSessionValue(
          exercise.planned_sets,
          volumePct,
          prescription.min_sets,
          prescription.max_sets,
        )
      : exercise.planned_sets,
    planned_reps: hasReps
      ? adjustSessionValue(
          exercise.planned_reps,
          volumePct,
          prescription.min_reps ?? MAIN_WORKOUT_MIN_REPS,
          prescription.max_reps ?? MAIN_WORKOUT_MAX_REPS,
        )
      : exercise.planned_reps,
    planned_duration_seconds: hasDuration
      ? adjustSessionValue(
          exercise.planned_duration_seconds,
          volumePct,
          MAIN_WORKOUT_MIN_DURATION_SECONDS,
          durationMax,
        )
      : exercise.planned_duration_seconds,
    planned_rest_seconds: exercise.planned_rest_seconds,
  };
}

export async function generateAIProgramService(
  userId: string,
  payload: unknown,
  hostname?: string | null,
): Promise<ProgramGenerateResponse> {
  assertUser(userId);
  const parsed = parseOrThrow(programGenerateSchema, payload);
  const supabase = await createClient();

  if (isProgramGenerationLimitEnforced(hostname)) {
    const { count, error: programLimitError } = await supabase
      .from("ai_plan_decisions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("request_type", "generate")
      .gte("created_at", getCurrentWeekStartIso());

    if (programLimitError) {
      throw mapDbError(programLimitError);
    }

    const used = count ?? 0;
    if (used >= AI_PROGRAM_WEEKLY_LIMIT) {
      throw new ServiceError(
        "FORBIDDEN",
        `Wykorzystałaś tygodniowy limit generowania programów (${AI_PROGRAM_WEEKLY_LIMIT}/${AI_PROGRAM_WEEKLY_LIMIT}).`,
      );
    }
  }

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
  const trainingState = await buildTrainingStateSnapshotService(userId);
  const exerciseLibrary = await loadExerciseLibraryPreview(supabase, userId);
  const fallbackAiTemplates = buildAIPlanTemplates(parsed.goal_text, parsed.constraints);
  const llmTemplates = await generateProgramTemplatesWithLLM({
    goalText: parsed.goal_text,
    constraints: parsed.constraints ?? null,
    sessionsPerWeek: parsed.sessions_per_week,
    mode,
    readinessScore: trainingState.readiness_score,
    readinessDrivers: trainingState.readiness_drivers,
    externalWorkoutsLast7d: trainingState.external_workouts_last_7d,
    topMovementKeys: trainingState.capability_summary
      .slice(0, 5)
      .map((item) => item.movement_key),
    libraryExerciseTitles: buildExerciseLibraryPromptEntries(exerciseLibrary),
    coachProfile: {
      persona_name: coachProfile.persona_name,
      focus: coachProfile.focus ?? null,
      risk_tolerance: coachProfile.risk_tolerance ?? null,
      preferred_methodology: coachProfile.preferred_methodology ?? null,
    },
  });
  const aiTemplates = llmTemplates?.templates?.length
    ? llmTemplates.templates
    : fallbackAiTemplates;
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
  const proposalTemplates = seedPlans
    .map((candidate) => candidate.generated_plan)
    .filter((template): template is ProgramGeneratedPlanTemplate => Boolean(template));
  const plannerProposal = createProgramPlannerProposal({
    source:
      mode === "existing_only"
        ? "existing_plan_selection"
        : mode === "new_only"
          ? "template_library"
          : "mixed_selection",
    goalText: parsed.goal_text,
    constraints: parsed.constraints ?? null,
    templates: proposalTemplates,
    rationale: llmTemplates
      ? [
          ...llmTemplates.rationale,
          `Tryb generowania: ${mode}.`,
          `Gotowość startowa: ${trainingState.readiness_score}/100.`,
        ]
      : [
          "Planner użył lokalnych template'ów heurystycznych jako fallbacku.",
          `Tryb generowania: ${mode}.`,
          `Gotowość startowa: ${trainingState.readiness_score}/100.`,
        ],
    assumptions: llmTemplates
      ? [
          ...llmTemplates.assumptions,
          "Warm-up i cool-down powinny istnieć w każdej jednostce.",
          "Przy niskiej gotowości objętość startowa powinna zostać ograniczona.",
        ]
      : [
          "Warm-up i cool-down powinny istnieć w każdej jednostce.",
          "Przy niskiej gotowości objętość startowa powinna zostać ograniczona.",
          "Gdy planner LLM nie zwróci poprawnego JSON, system przełącza się na lokalne template'y.",
        ],
  });
  const validation = validateProgramTemplates({
    templates: plannerProposal.templates,
    readinessScore: trainingState.readiness_score,
  });
  const repairedProposal = repairProgramTemplates({
    templates: plannerProposal.templates,
    violations: validation.violations,
  });
  const postRepairValidation = validateProgramTemplates({
    templates: repairedProposal.templates,
    readinessScore: trainingState.readiness_score,
  });
  const realism = scoreProgramTemplatesRealism({
    templates: repairedProposal.templates,
    violations: postRepairValidation.violations,
    repairLog: repairedProposal.repairLog,
    readinessScore: trainingState.readiness_score,
  });
  const repairedTemplatesByKey = new Map(
    repairedProposal.templates.map((template) => [template.template_key, template]),
  );
  seedPlans = seedPlans.map((candidate) => {
    if (!candidate.generated_plan) return candidate;
    return {
      ...candidate,
      generated_plan:
        repairedTemplatesByKey.get(candidate.generated_plan.template_key) ??
        candidate.generated_plan,
    };
  });
  const capabilityCappedSeedPlans = applyCapabilityCapsToCandidates(
    seedPlans,
    trainingState,
  );
  const sanitizedSeedPlans = sanitizeSchedulePlanCandidates(
    capabilityCappedSeedPlans.candidates,
  );
  const sessions = generateProgramSchedule(
    sanitizedSeedPlans.candidates,
    parsed.duration_months,
    sessionsPerWeek,
    parsed.weekdays,
  ).map((session) => {
    if (trainingState.readiness_score >= 60) return session;
    return {
      ...session,
      progression_overrides: {
        ...session.progression_overrides,
        load_adjustment_percent: Math.min(
          session.progression_overrides.load_adjustment_percent,
          -10,
        ),
        volume_adjustment_percent: Math.min(
          session.progression_overrides.volume_adjustment_percent,
          -10,
        ),
        emphasis: "conservative_start",
      },
    };
  });
  const weeksCount = getWeeksCount(parsed.duration_months);
  const interpretedGoalText = buildInterpretedGoalText(
    parsed.goal_text,
    parsed.constraints ?? null,
  );
  let resolvedMixRatio = 100;
  if (mode === "mix_existing_new") {
    resolvedMixRatio = mixRatio;
  } else if (mode === "new_only") {
    resolvedMixRatio = 0;
  }

  const programPayload = {
    name: buildProgramName(parsed.goal_text, parsed.constraints ?? null),
    goal_text: interpretedGoalText,
    duration_months: parsed.duration_months,
    weeks_count: weeksCount,
    sessions_per_week: sessionsPerWeek,
    program_mode: mode,
    mix_ratio: resolvedMixRatio,
    source: "ai" as const,
    status: "draft" as const,
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
      training_state: {
        readiness_score: trainingState.readiness_score,
        readiness_drivers: trainingState.readiness_drivers,
        external_workouts_last_7d: trainingState.external_workouts_last_7d,
        external_duration_minutes_last_7d:
          trainingState.external_duration_minutes_last_7d,
        fatigue_notes_last_14d: trainingState.fatigue_notes_last_14d,
      },
    },
  };

  const guardrailEvents = [
    ...capabilityCappedSeedPlans.guardrailEvents,
    ...sanitizedSeedPlans.guardrailEvents,
  ];
  const plannerOutput = {
    ...plannerProposal,
    templates: repairedProposal.templates,
  };
  const trainingStatePreview = {
    readiness_score: trainingState.readiness_score,
    readiness_drivers: trainingState.readiness_drivers,
    external_workouts_last_7d: trainingState.external_workouts_last_7d,
    external_duration_minutes_last_7d:
      trainingState.external_duration_minutes_last_7d,
    fatigue_notes_last_14d: trainingState.fatigue_notes_last_14d,
  };
  const { data: decisionLog, error: decisionLogError } = await insertAIPlanDecision(
    supabase,
    userId,
    {
      request_type: "generate",
      planner_source: llmTemplates?.sourceLabel ?? "fallback",
      input_snapshot: {
        goal_text: parsed.goal_text,
        constraints: parsed.constraints ?? null,
        duration_months: parsed.duration_months,
        sessions_per_week: parsed.sessions_per_week,
        weekdays: parsed.weekdays ?? null,
        program_mode: parsed.program_mode,
        mix_ratio: mixRatio,
        training_state: trainingStatePreview,
      } as Json,
      planner_output: plannerOutput as Json,
      validation_result: postRepairValidation as Json,
      repair_log: repairedProposal.repairLog as Json,
      final_output: {
        program: programPayload,
        sessions,
        recommendations: buildRecommendations(
          weeksCount,
          sessionsPerWeek,
          sanitizedSeedPlans.candidates,
          mode,
          mixRatio,
        ),
      } as Json,
      guardrail_events: guardrailEvents as Json,
      realism_score: realism.score,
      accepted: postRepairValidation.valid,
    },
  );
  if (decisionLogError) throw mapDbError(decisionLogError);

  return {
    decision_log_id: decisionLog?.id ?? null,
    program: programPayload,
    sessions,
    recommendations: buildRecommendations(
      weeksCount,
      sessionsPerWeek,
      sanitizedSeedPlans.candidates,
      mode,
      mixRatio,
    ),
    planner_proposal: plannerOutput,
    validation: postRepairValidation,
    repair_log: repairedProposal.repairLog,
    realism,
    guardrail_events: guardrailEvents,
    training_state: trainingStatePreview,
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

  if (parsed.decision_log_id) {
    const { error: updateDecisionError } = await updateAIPlanDecisionById(
      supabase,
      userId,
      parsed.decision_log_id,
      {
        training_program_id: insertedProgram.id,
        final_output: {
          program_id: insertedProgram.id,
          program_name: insertedProgram.name,
          sessions_count: insertedSessions?.length ?? 0,
        } as Json,
        accepted: true,
      },
    );
    if (updateDecisionError) throw mapDbError(updateDecisionError);
  }

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

export async function listProgramNotesService(
  userId: string,
  programId: string,
  query: unknown,
): Promise<{ items: ProgramNoteDTO[] }> {
  assertUser(userId);
  const parsed = parseOrThrow(programNoteListQuerySchema, query ?? {});
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

  if (parsed.program_session_id) {
    const { data: session, error: sessionError } = await findProgramSessionById(
      supabase,
      userId,
      parsed.program_session_id,
    );
    if (sessionError) throw mapDbError(sessionError);
    if (session?.training_program_id !== programId) {
      throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
    }
  }

  const { data, error } = await listProgramNotesByProgramId(supabase, userId, programId, {
    limit: parsed.limit,
    program_session_id: parsed.program_session_id,
  });
  if (error) {
    if (isMissingProgramNotesTableError(error)) {
      return { items: [] };
    }
    throw mapDbError(error);
  }

  return { items: (data ?? []) as ProgramNoteDTO[] };
}

export async function createProgramNoteService(
  userId: string,
  programId: string,
  payload: unknown,
): Promise<ProgramNoteDTO> {
  assertUser(userId);
  const parsed = parseOrThrow(programNoteCreateSchema, payload);
  return await createProgramNoteInternal(userId, programId, {
    ...parsed,
    source: "user",
  });
}

export async function createProgramSystemNoteService(
  userId: string,
  programId: string,
  input: ProgramNoteCreateCommand,
): Promise<ProgramNoteDTO> {
  assertUser(userId);
  return await createProgramNoteInternal(userId, programId, {
    ...input,
    source: input.source ?? "ai_action",
  });
}

async function createProgramNoteInternal(
  userId: string,
  programId: string,
  input: ProgramNoteCreateCommand,
): Promise<ProgramNoteDTO> {
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

  if (input.program_session_id) {
    const { data: session, error: sessionError } = await findProgramSessionById(
      supabase,
      userId,
      input.program_session_id,
    );
    if (sessionError) throw mapDbError(sessionError);
    if (session?.training_program_id !== programId) {
      throw new ServiceError("NOT_FOUND", "Sesja programu nie została znaleziona.");
    }
  }

  const { data, error } = await insertProgramNote(supabase, userId, programId, input);
  if (error) throw mapDbError(error);
  if (!data) {
    throw new ServiceError("INTERNAL", "Nie udało się zapisać uwagi do programu.");
  }

  await applyCapabilityFeedbackSignal({
    userId,
    noteText: input.note_text,
    fatigueLevel: input.fatigue_level ?? null,
    vitalityLevel: input.vitality_level ?? null,
  }).catch((error) => {
    console.warn(
      "[createProgramNoteInternal] capability feedback update skipped",
      error,
    );
  });

  return data as ProgramNoteDTO;
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
  let resolvedSession = session;

  if (isNew) {
    await applyProgramProgressionToStartedSession({
      supabase,
      userId,
      workoutSessionId: session.id,
      progressionOverrides: programSession.progression_overrides,
    });
    resolvedSession = await getWorkoutSessionService(userId, session.id);
  }

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
    workout_session: resolvedSession,
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
  await cleanupGeneratedProgramPlans({
    supabase,
    userId,
    programName: program.name,
    programPlanIds,
  });
}

async function cleanupGeneratedProgramPlans(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  programName: string;
  programPlanIds: string[];
}): Promise<void> {
  const { supabase, userId, programName, programPlanIds } = params;
  const generatedDescription = `Plan wygenerowany dla programu: ${programName}`;
  for (const planId of programPlanIds) {
    const { data: plan, error: planError } = await findWorkoutPlanById(supabase, userId, planId);
    if (planError) throw mapDbError(planError);
    if (!plan) continue;

    const isGeneratedDescription = (plan.description ?? "") === generatedDescription;
    const isGeneratedName = plan.name.startsWith(`${programName} · Sesja`);
    if (!isGeneratedDescription && !isGeneratedName) continue;

    const { count, error: refCountError } = await supabase
      .from("program_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("workout_plan_id", planId);
    if (refCountError) throw mapDbError(refCountError);
    if ((count ?? 0) > 0) continue;

    const { error: deletePlanError } = await supabase
      .from("workout_plans")
      .delete()
      .eq("user_id", userId)
      .eq("id", planId);
    if (deletePlanError) throw mapDbError(deletePlanError);
  }
}
