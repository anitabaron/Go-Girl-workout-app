import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  autosaveWorkoutSessionExerciseService,
  ServiceError,
} from "@/services/workout-sessions";

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
    id: string;
    order: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { id, order } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    const orderParam = order ?? new URL(request.url).searchParams.get("order");

    if (!sessionId) {
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 }
      );
    }

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 }
      );
    }

    if (!orderParam) {
      return NextResponse.json(
        { message: "Brak parametru order w ścieżce." },
        { status: 400 }
      );
    }

    const orderNumber = Number.parseInt(orderParam, 10);

    if (Number.isNaN(orderNumber) || orderNumber <= 0) {
      return NextResponse.json(
        { message: "order musi być liczbą całkowitą większą od 0." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = await autosaveWorkoutSessionExerciseService(
      userId,
      sessionId,
      orderNumber,
      body
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Nieprawidłowe dane wejściowe.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 }
      );
    }

    console.error(
      "PATCH /api/workout-sessions/[id]/exercises/[order] unexpected error",
      error
    );
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
