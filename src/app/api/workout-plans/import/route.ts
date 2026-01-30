import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  importWorkoutPlanService,
  ServiceError,
} from "@/services/workout-plans";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();

    const result = await importWorkoutPlanService(userId, body);

    return NextResponse.json(result, { status: 201 });
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
      console.error(
        "[POST /api/workout-plans/import] ServiceError:",
        error.code,
        error.message,
      );
      return respondWithServiceError(error);
    }

    console.error("[POST /api/workout-plans/import] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: "Wystąpił błąd podczas importu planu.",
        code: "INTERNAL",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
