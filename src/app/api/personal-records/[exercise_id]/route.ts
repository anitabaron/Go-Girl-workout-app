import { NextResponse } from "next/server";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  getPersonalRecordsByExerciseService,
  ServiceError,
} from "@/services/personal-records";

function getUserId() {
  return process.env.DEFAULT_USER_ID ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

type RouteContext = {
  params: Promise<{
    exercise_id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { exercise_id } = await params;
    const exerciseId =
      exercise_id ?? new URL(request.url).searchParams.get("exercise_id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 }
      );
    }

    const result = await getPersonalRecordsByExerciseService(userId, exerciseId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error(
      "GET /api/personal-records/[exercise_id] unexpected error",
      error
    );
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
