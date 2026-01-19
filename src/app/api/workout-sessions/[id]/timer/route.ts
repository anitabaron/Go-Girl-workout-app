import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  updateWorkoutSessionTimerService,
  ServiceError,
} from "@/services/workout-sessions";
import { createClient } from "@/db/supabase.server";

/**
 * Pobiera ID użytkownika z sesji Supabase dla API routes.
 * Zwraca błąd 401 jeśli użytkownik nie jest zalogowany.
 */
async function getUserIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return user.id;
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

/**
 * PATCH /api/workout-sessions/{id}/timer
 * 
 * Aktualizuje timer sesji treningowej.
 * Obsługuje start/resume, pause/exit i ręczną aktualizację czasu aktywnego.
 * 
 * Request body:
 * - active_duration_seconds?: number (cumulative - dodaje do istniejącej wartości)
 * - last_timer_started_at?: string (ISO 8601 timestamp)
 * - last_timer_stopped_at?: string (ISO 8601 timestamp)
 * 
 * Co najmniej jedno pole musi być podane.
 * 
 * Success: 200 OK z danymi timera
 * Errors: 400 (walidacja), 401 (brak autoryzacji), 404 (sesja nie znaleziona), 409 (sesja nie in_progress), 500 (błąd serwera)
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  console.log("[PATCH /api/workout-sessions/[id]/timer] Starting request");

  try {
    const userId = await getUserIdFromSession();
    console.log("[PATCH /api/workout-sessions/[id]/timer] userId:", userId);

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    console.log("[PATCH /api/workout-sessions/[id]/timer] Params - id:", id);
    console.log(
      "[PATCH /api/workout-sessions/[id]/timer] Parsed sessionId:",
      sessionId
    );

    if (!sessionId) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] Missing sessionId"
      );
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 }
      );
    }

    if (!isUuid(sessionId)) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] Invalid sessionId format:",
        sessionId
      );
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log(
        "[PATCH /api/workout-sessions/[id]/timer] Request body:",
        JSON.stringify(body, null, 2)
      );
    } catch (jsonError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] JSON parse error:",
        jsonError
      );
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 }
      );
    }

    console.log(
      "[PATCH /api/workout-sessions/[id]/timer] Calling updateWorkoutSessionTimerService"
    );
    const updated = await updateWorkoutSessionTimerService(
      userId,
      sessionId,
      body
    );
    console.log(
      "[PATCH /api/workout-sessions/[id]/timer] Service returned successfully:",
      JSON.stringify(updated, null, 2)
    );

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error(
      "[PATCH /api/workout-sessions/[id]/timer] Error caught:",
      error
    );

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Brak autoryzacji. Zaloguj się ponownie.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (error instanceof ServiceError) {
      console.error("[PATCH /api/workout-sessions/[id]/timer] ServiceError:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      console.error("[PATCH /api/workout-sessions/[id]/timer] ZodError:", {
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
      "[PATCH /api/workout-sessions/[id]/timer] Unexpected error:",
      error
    );
    if (error instanceof Error) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] Error stack:",
        error.stack
      );
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] Error name:",
        error.name
      );
      console.error(
        "[PATCH /api/workout-sessions/[id]/timer] Error message:",
        error.message
      );
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
