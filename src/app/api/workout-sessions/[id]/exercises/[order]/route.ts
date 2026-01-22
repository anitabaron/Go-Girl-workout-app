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
  
  try {
    const userId = await getUserIdFromSession();

    const { id, order } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    const orderParam = order ?? new URL(request.url).searchParams.get("order");
    

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
      
      // Debug: loguj co jest otrzymywane w API - użyj console.error dla lepszej widoczności
      type SetData = {
        set_number?: number;
        reps?: number | null;
        duration_seconds?: number | null;
        weight_kg?: number | null;
      };
      const setsInfo = (body.sets as SetData[] | undefined)?.map((set: SetData, idx: number) => ({
        index: idx,
        set_number: set.set_number,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
        weight_kg: set.weight_kg,
      })) || [];
      
      console.error('=== [API] PATCH /api/workout-sessions/[id]/exercises/[order] ===');
      console.error('Exercise Order:', orderNumber);
      console.error('Sets Count:', body.sets?.length ?? 0);
      console.error('Sets:', JSON.stringify(setsInfo, null, 2));
      console.error('Is Skipped:', body.is_skipped);
      console.error('Advance Cursor:', body.advance_cursor_to_next);
      console.error('========================================================');
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



    const result = await autosaveWorkoutSessionExerciseService(
      userId,
      sessionId,
      orderNumber,
      body
    );


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
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
