import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  deletePersonalRecordsByExerciseService,
  getPersonalRecordsByExerciseService,
} from "@/services/personal-records";

type RouteContext = {
  params: Promise<{
    exercise_id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { exercise_id } = await params;
    const exerciseId =
      exercise_id ?? new URL(request.url).searchParams.get("exercise_id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 },
      );
    }

    const result = await getPersonalRecordsByExerciseService(
      userId,
      exerciseId,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/personal-records/[exercise_id]");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { exercise_id } = await params;
    const exerciseId =
      exercise_id ?? new URL(request.url).searchParams.get("exercise_id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 },
      );
    }

    await deletePersonalRecordsByExerciseService(userId, exerciseId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/personal-records/[exercise_id]",
    );
  }
}
