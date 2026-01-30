import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  updateWorkoutSessionStatusService,
  ServiceError,
} from "@/services/workout-sessions";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");

    if (!sessionId) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] Missing sessionId",
      );
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 },
      );
    }

    if (!isUuid(sessionId)) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] Invalid sessionId format:",
        sessionId,
      );
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] JSON parse error:",
        jsonError,
      );
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    const updated = await updateWorkoutSessionStatusService(
      userId,
      sessionId,
      body,
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error(
      "[PATCH /api/workout-sessions/[id]/status] Error caught:",
      error,
    );

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
      console.error("[PATCH /api/workout-sessions/[id]/status] ServiceError:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      console.error("[PATCH /api/workout-sessions/[id]/status] ZodError:", {
        issues: error.issues,
        formatted: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return NextResponse.json(
        {
          message: "Nieprawidłowe dane wejściowe.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 },
      );
    }

    console.error(
      "[PATCH /api/workout-sessions/[id]/status] Unexpected error:",
      error,
    );
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
