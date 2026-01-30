import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  deletePersonalRecordsByExerciseService,
  getPersonalRecordsByExerciseService,
  ServiceError,
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Brak autoryzacji. Zaloguj się ponownie.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error(
      "GET /api/personal-records/[exercise_id] unexpected error",
      error,
    );
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Brak autoryzacji. Zaloguj się ponownie.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error(
      "DELETE /api/personal-records/[exercise_id] unexpected error",
      error,
    );
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
