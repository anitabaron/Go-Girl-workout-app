import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  updateWorkoutSessionStatusService,
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
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  console.log("[PATCH /api/workout-sessions/[id]/status] Starting request");
  
  try {
    const userId = getUserId();
    console.log("[PATCH /api/workout-sessions/[id]/status] userId:", userId);

    if (!userId || !isUuid(userId)) {
      console.error("[PATCH /api/workout-sessions/[id]/status] Invalid userId");
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    console.log("[PATCH /api/workout-sessions/[id]/status] Params - id:", id);
    console.log("[PATCH /api/workout-sessions/[id]/status] Parsed sessionId:", sessionId);

    if (!sessionId) {
      console.error("[PATCH /api/workout-sessions/[id]/status] Missing sessionId");
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 }
      );
    }

    if (!isUuid(sessionId)) {
      console.error("[PATCH /api/workout-sessions/[id]/status] Invalid sessionId format:", sessionId);
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log("[PATCH /api/workout-sessions/[id]/status] Request body:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("[PATCH /api/workout-sessions/[id]/status] JSON parse error:", jsonError);
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 }
      );
    }

    console.log("[PATCH /api/workout-sessions/[id]/status] Calling updateWorkoutSessionStatusService");
    const updated = await updateWorkoutSessionStatusService(
      userId,
      sessionId,
      body
    );
    console.log("[PATCH /api/workout-sessions/[id]/status] Service returned successfully:", JSON.stringify(updated, null, 2));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/workout-sessions/[id]/status] Error caught:", error);
    
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
        { status: 400 }
      );
    }

    console.error(
      "[PATCH /api/workout-sessions/[id]/status] Unexpected error:",
      error
    );
    if (error instanceof Error) {
      console.error("[PATCH /api/workout-sessions/[id]/status] Error stack:", error.stack);
      console.error("[PATCH /api/workout-sessions/[id]/status] Error name:", error.name);
      console.error("[PATCH /api/workout-sessions/[id]/status] Error message:", error.message);
    }
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
