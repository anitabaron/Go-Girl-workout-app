import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  autosaveWorkoutSessionExerciseService,
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
    order: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Starting request");
  
  try {
    const userId = await getUserIdFromSession();
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] userId:", userId);

    const { id, order } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    const orderParam = order ?? new URL(request.url).searchParams.get("order");
    
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Params - id:", id, "order:", order);
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Parsed - sessionId:", sessionId, "orderParam:", orderParam);

    if (!sessionId) {
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Missing sessionId");
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 }
      );
    }

    if (!isUuid(sessionId)) {
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Invalid sessionId format:", sessionId);
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 }
      );
    }

    if (!orderParam) {
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Missing orderParam");
      return NextResponse.json(
        { message: "Brak parametru order w ścieżce." },
        { status: 400 }
      );
    }

    const orderNumber = Number.parseInt(orderParam, 10);
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Parsed orderNumber:", orderNumber);

    if (Number.isNaN(orderNumber) || orderNumber <= 0) {
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Invalid orderNumber:", orderNumber);
      return NextResponse.json(
        { message: "order musi być liczbą całkowitą większą od 0." },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Request body:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/exercises/[order]] JSON parse error",
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

    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Calling autosaveWorkoutSessionExerciseService");
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Parameters:", {
      userId,
      sessionId,
      order: orderNumber,
      bodyKeys: Object.keys(body),
    });

    const result = await autosaveWorkoutSessionExerciseService(
      userId,
      sessionId,
      orderNumber,
      body
    );

    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Service returned successfully");
    console.log("[PATCH /api/workout-sessions/[id]/exercises/[order]] Result:", JSON.stringify(result, null, 2));

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Error caught:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Brak autoryzacji. Zaloguj się ponownie.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    
    if (error instanceof ServiceError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/exercises/[order]] ServiceError:",
        {
          code: error.code,
          message: error.message,
          details: error.details,
        }
      );
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/exercises/[order]] ZodError:",
        {
          issues: error.issues,
          formatted: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }
      );
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
      "[PATCH /api/workout-sessions/[id]/exercises/[order]] Unexpected error:",
      error
    );
    if (error instanceof Error) {
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Error stack:", error.stack);
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Error name:", error.name);
      console.error("[PATCH /api/workout-sessions/[id]/exercises/[order]] Error message:", error.message);
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
