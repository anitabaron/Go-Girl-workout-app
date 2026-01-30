import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { createClient } from "@/db/supabase.server";

/**
 * Znajduje osierocone ćwiczenia planów treningowych bez ich usuwania.
 *
 * Ćwiczenie planu jest osierocone jeśli:
 * - plan_id nie istnieje w workout_plans
 */
async function findOrphanedPlanExercises() {
  const supabase = await createClient();

  // Pobierz wszystkie ćwiczenia planów
  const { data: allPlanExercises, error: allPlanExercisesError } =
    await supabase.from("workout_plan_exercises").select("id, plan_id");

  if (allPlanExercisesError) {
    throw new Error(
      `Failed to fetch plan exercises: ${allPlanExercisesError.message}`,
    );
  }

  if (!allPlanExercises || allPlanExercises.length === 0) {
    return [];
  }

  // Pobierz wszystkie istniejące plan_ids
  const { data: existingPlans, error: plansError } = await supabase
    .from("workout_plans")
    .select("id");

  if (plansError) {
    throw new Error(`Failed to fetch workout plans: ${plansError.message}`);
  }

  // Utwórz mapę dla szybkiego wyszukiwania
  const existingPlanIds = new Set(existingPlans?.map((p) => p.id) || []);

  // Znajdź osierocone ćwiczenia planów
  return allPlanExercises
    .filter((planExercise) => {
      const planId = planExercise.plan_id;

      // Ćwiczenie planu jest osierocone jeśli plan_id nie istnieje w workout_plans
      return !existingPlanIds.has(planId);
    })
    .map((planExercise) => planExercise.id);
}

/**
 * GET - Sprawdza ile osieroconych ćwiczeń planów treningowych jest w bazie (bez usuwania).
 */
export async function GET() {
  try {
    await getUserIdFromSession();
    const orphanedIds = await findOrphanedPlanExercises();

    return NextResponse.json({
      message: `Found ${orphanedIds.length} orphaned workout plan exercise(s)`,
      count: orphanedIds.length,
      orphanedIds: orphanedIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error finding orphaned plan exercises:", error);
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
 * POST - Usuwa osierocone ćwiczenia planów treningowych - te, które odnoszą się do nieistniejących planów.
 *
 * Ćwiczenie planu jest osierocone jeśli:
 * - plan_id nie istnieje w workout_plans
 */
export async function POST() {
  try {
    await getUserIdFromSession();
    const supabase = await createClient();

    const orphanedIds = await findOrphanedPlanExercises();

    if (orphanedIds.length === 0) {
      return NextResponse.json({
        message: "No orphaned workout plan exercises found",
        deletedCount: 0,
      });
    }

    // Usuń osierocone ćwiczenia planów
    const { error: deleteError } = await supabase
      .from("workout_plan_exercises")
      .delete()
      .in("id", orphanedIds);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete orphaned plan exercises",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${orphanedIds.length} orphaned workout plan exercise(s)`,
      deletedCount: orphanedIds.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error cleaning up orphaned plan exercises:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
