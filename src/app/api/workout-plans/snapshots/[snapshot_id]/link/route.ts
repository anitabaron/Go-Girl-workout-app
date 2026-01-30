import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { linkSnapshotToExerciseService } from "@/services/workout-plans";

type RouteContext = {
  params: Promise<{
    snapshot_id: string;
  }>;
};

/**
 * POST /api/workout-plans/snapshots/[snapshot_id]/link
 * Łączy wszystkie wystąpienia snapshotu (po snapshot_id) z ćwiczeniem z biblioteki.
 * Body: { exercise_id: string }
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { snapshot_id } = await params;
    const snapshotId =
      snapshot_id ?? new URL(request.url).searchParams.get("snapshot_id");

    if (!snapshotId) {
      return NextResponse.json(
        { message: "Brak identyfikatora snapshotu w ścieżce." },
        { status: 400 },
      );
    }

    // Check if request has body
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "Content-Type musi być application/json." },
        { status: 400 },
      );
    }

    // Safely parse JSON body
    let body: unknown;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { message: "Body żądania nie może być puste." },
          { status: 400 },
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return NextResponse.json(
          { message: "Nieprawidłowy format JSON w body żądania." },
          { status: 400 },
        );
      }
      throw parseError;
    }

    // Validate body
    if (typeof body !== "object" || body === null || !("exercise_id" in body)) {
      return NextResponse.json(
        { message: "Body musi zawierać pole exercise_id." },
        { status: 400 },
      );
    }

    const { exercise_id } = body as { exercise_id: string };

    if (typeof exercise_id !== "string" || !exercise_id) {
      return NextResponse.json(
        { message: "exercise_id musi być niepustym stringiem." },
        { status: 400 },
      );
    }

    await linkSnapshotToExerciseService(userId, snapshotId, exercise_id);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/workout-plans/snapshots/[snapshot_id]/link",
    );
  }
}
