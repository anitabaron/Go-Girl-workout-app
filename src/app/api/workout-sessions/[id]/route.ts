import { NextResponse } from "next/server";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  getWorkoutSessionService,
  deleteWorkoutSessionService,
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

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");

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

    const session = await getWorkoutSessionService(userId, sessionId);

    return NextResponse.json(session, { status: 200 });
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

    console.error("GET /api/workout-sessions/[id] unexpected error", error);
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");

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

    await deleteWorkoutSessionService(userId, sessionId);

    return new Response(null, { status: 204 });
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

    console.error("DELETE /api/workout-sessions/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
