import { createClient } from "@/db/supabase.server";
import { mapDbError } from "@/lib/service-utils";
import { inferMovementKey, type MovementKey } from "@/lib/training/movement-keys";
import type { UserCapabilityProfileDTO } from "@/types";

type ExternalWorkoutRow = {
  started_at: string;
  duration_minutes: number;
  intensity_rpe: number | null;
  sport_type: string;
};

type ProgramNoteRow = {
  fatigue_level: number | null;
  vitality_level: number | null;
  note_text: string;
  created_at: string;
};

export type TrainingStateSnapshot = {
  external_workouts_last_7d: number;
  external_duration_minutes_last_7d: number;
  average_external_rpe_last_7d: number | null;
  readiness_score: number;
  readiness_drivers: string[];
  fatigue_notes_last_14d: number;
  capability_summary: Array<{
    movement_key: MovementKey;
    confidence_score: number;
    pain_flag: boolean;
    comfort_max_reps: number | null;
    comfort_max_duration_seconds: number | null;
  }>;
};

export async function buildTrainingStateSnapshotService(
  userId: string,
): Promise<TrainingStateSnapshot> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { data: externalData, error: externalError },
    { data: notesData, error: notesError },
    { data: capabilitiesData, error: capabilitiesError },
  ] = await Promise.all([
    supabase
      .from("external_workouts")
      .select("started_at,duration_minutes,intensity_rpe,sport_type")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("program_notes")
      .select("fatigue_level,vitality_level,note_text,created_at")
      .eq("user_id", userId)
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("user_capability_profiles")
      .select(
        "id,movement_key,comfort_max_reps,comfort_max_duration_seconds,confidence_score,pain_flag,exercise_id,current_level,best_recent_reps,best_recent_duration_seconds,best_recent_load_kg,comfort_max_load_kg,weekly_progression_cap_percent,per_session_progression_cap_reps,per_session_progression_cap_duration_seconds,pain_notes,updated_from,created_at,updated_at",
      )
      .eq("user_id", userId),
  ]);

  if (externalError) throw mapDbError(externalError);
  if (notesError) throw mapDbError(notesError);
  if (capabilitiesError) throw mapDbError(capabilitiesError);

  return summarizeTrainingState({
    external: (externalData ?? []) as ExternalWorkoutRow[],
    notes: (notesData ?? []) as ProgramNoteRow[],
    capabilities: (capabilitiesData ?? []) as UserCapabilityProfileDTO[],
  });
}

export function summarizeTrainingState(input: {
  external: ExternalWorkoutRow[];
  notes: ProgramNoteRow[];
  capabilities: UserCapabilityProfileDTO[];
}): TrainingStateSnapshot {
  const externalWorkouts = input.external;
  const totalDuration = externalWorkouts.reduce(
    (sum, workout) => sum + workout.duration_minutes,
    0,
  );
  const averageRpe =
    externalWorkouts.filter((workout) => typeof workout.intensity_rpe === "number").length > 0
      ? Math.round(
          (externalWorkouts.reduce(
            (sum, workout) => sum + (workout.intensity_rpe ?? 0),
            0,
          ) /
            externalWorkouts.filter((workout) => typeof workout.intensity_rpe === "number")
              .length) *
            10,
        ) / 10
      : null;

  const fatigueNotes = input.notes.filter(
    (note) => typeof note.fatigue_level === "number" && note.fatigue_level >= 7,
  );
  const avgFatigue =
    input.notes.filter((note) => typeof note.fatigue_level === "number").length > 0
      ? input.notes.reduce((sum, note) => sum + (note.fatigue_level ?? 0), 0) /
        input.notes.filter((note) => typeof note.fatigue_level === "number").length
      : null;
  const avgVitality =
    input.notes.filter((note) => typeof note.vitality_level === "number").length > 0
      ? input.notes.reduce((sum, note) => sum + (note.vitality_level ?? 0), 0) /
        input.notes.filter((note) => typeof note.vitality_level === "number").length
      : null;

  let readinessScore = 100;
  const readinessDrivers: string[] = [];

  if (externalWorkouts.length >= 3) {
    readinessScore -= 12;
    readinessDrivers.push("wysoka liczba treningów zewnętrznych w ostatnich 7 dniach");
  }
  if (totalDuration >= 180) {
    readinessScore -= 10;
    readinessDrivers.push("duże obciążenie czasowe poza aplikacją w ostatnich 7 dniach");
  }
  if (averageRpe !== null && averageRpe >= 7) {
    readinessScore -= 8;
    readinessDrivers.push("wysokie RPE treningów zewnętrznych");
  }
  if (avgFatigue !== null && avgFatigue >= 7) {
    readinessScore -= 12;
    readinessDrivers.push("wysokie zmęczenie w ostatnich notatkach programu");
  }
  if (avgVitality !== null && avgVitality <= 4) {
    readinessScore -= 8;
    readinessDrivers.push("niska witalność w ostatnich notatkach programu");
  }
  if (input.capabilities.some((capability) => capability.pain_flag)) {
    readinessScore -= 15;
    readinessDrivers.push("aktywne flagi bólowe w capability profile");
  }

  readinessScore = Math.max(25, readinessScore);

  return {
    external_workouts_last_7d: externalWorkouts.length,
    external_duration_minutes_last_7d: totalDuration,
    average_external_rpe_last_7d: averageRpe,
    readiness_score: readinessScore,
    readiness_drivers: readinessDrivers,
    fatigue_notes_last_14d: fatigueNotes.length,
    capability_summary: input.capabilities.map((capability) => ({
      movement_key:
        (capability.movement_key as MovementKey) ??
        inferMovementKey({ title: capability.current_level }),
      confidence_score: capability.confidence_score,
      pain_flag: capability.pain_flag,
      comfort_max_reps: capability.comfort_max_reps,
      comfort_max_duration_seconds: capability.comfort_max_duration_seconds,
    })),
  };
}
