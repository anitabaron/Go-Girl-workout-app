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

    let body;
    try {
      body = await request.json();
    } catch {
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Brak autoryzacji. Zaloguj się ponownie.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    
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

    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
