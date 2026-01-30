import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { createClient } from "@/db/supabase.server";

/**
 * Znajduje osierocone set logs bez ich usuwania.
 *
 * Set log jest osierocony jeśli:
 * - session_exercise_id nie istnieje w workout_session_exercises
 * - LUB workout_session_exercises.session_id nie istnieje w workout_sessions
 */
async function findOrphanedSetLogs() {
  const supabase = await createClient();

  // Pobierz wszystkie set logs
  const { data: allSets, error: allSetsError } = await supabase
    .from("workout_session_sets")
    .select("id, session_exercise_id");

  if (allSetsError) {
    throw new Error(`Failed to fetch set logs: ${allSetsError.message}`);
  }

  if (!allSets || allSets.length === 0) {
    return [];
  }

  // Pobierz wszystkie istniejące session_exercise_ids z ich session_id
  const { data: existingExercises, error: exercisesError } = await supabase
    .from("workout_session_exercises")
    .select("id, session_id");

  if (exercisesError) {
    throw new Error(
      `Failed to fetch session exercises: ${exercisesError.message}`,
    );
  }

  // Pobierz wszystkie istniejące session_ids
  const { data: existingSessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id");

  if (sessionsError) {
    throw new Error(
      `Failed to fetch workout sessions: ${sessionsError.message}`,
    );
  }

  // Utwórz mapy dla szybkiego wyszukiwania
  const existingExerciseIds = new Set(
    existingExercises?.map((e) => e.id) || [],
  );
  const existingSessionIds = new Set(existingSessions?.map((s) => s.id) || []);
  const exerciseToSessionMap = new Map(
    existingExercises?.map((e) => [e.id, e.session_id]) || [],
  );

  // Znajdź osierocone set logs
  return allSets
    .filter((set) => {
      const exerciseId = set.session_exercise_id;

      // Set log jest osierocony jeśli:
      // 1. session_exercise_id nie istnieje w workout_session_exercises
      if (!existingExerciseIds.has(exerciseId)) {
        return true;
      }

      // 2. LUB session_id z workout_session_exercises nie istnieje w workout_sessions
      const sessionId = exerciseToSessionMap.get(exerciseId);
      if (sessionId && !existingSessionIds.has(sessionId)) {
        return true;
      }

      return false;
    })
    .map((set) => set.id);
}

/**
 * GET - Sprawdza ile osieroconych set logs jest w bazie (bez usuwania).
 */
export async function GET() {
  try {
    await getUserIdFromSession();
    const orphanedIds = await findOrphanedSetLogs();

    return NextResponse.json({
      message: `Found ${orphanedIds.length} orphaned set log(s)`,
      count: orphanedIds.length,
      orphanedIds: orphanedIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error finding orphaned set logs:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Usuwa osierocone set logs - te, które odnoszą się do nieistniejących sesji treningowych.
 *
 * Set log jest osierocony jeśli:
 * - session_exercise_id nie istnieje w workout_session_exercises
 * - LUB workout_session_exercises.session_id nie istnieje w workout_sessions
 */
export async function POST() {
  try {
    await getUserIdFromSession();
    const supabase = await createClient();

    const orphanedIds = await findOrphanedSetLogs();

    if (orphanedIds.length === 0) {
      return NextResponse.json({
        message: "No orphaned set logs found",
        deletedCount: 0,
      });
    }

    // Usuń osierocone set logs
    const { error: deleteError } = await supabase
      .from("workout_session_sets")
      .delete()
      .in("id", orphanedIds);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete orphaned set logs",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${orphanedIds.length} orphaned set log(s)`,
      deletedCount: orphanedIds.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error cleaning up orphaned set logs:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
