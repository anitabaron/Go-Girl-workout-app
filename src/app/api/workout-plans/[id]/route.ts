import { NextResponse } from "next/server";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  deleteWorkoutPlanService,
  getWorkoutPlanService,
  ServiceError,
  updateWorkoutPlanService,
} from "@/services/workout-plans";
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 }
      );
    }

    const workoutPlan = await getWorkoutPlanService(userId, workoutPlanId);

    return NextResponse.json(workoutPlan, { status: 200 });
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

    console.error("GET /api/workout-plans/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 }
      );
    }

    // Check if request has body
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "Content-Type musi być application/json." },
        { status: 400 }
      );
    }

    // Safely parse JSON body
    let body: unknown;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { message: "Body żądania nie może być puste." },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return NextResponse.json(
          { message: "Nieprawidłowy format JSON w body żądania." },
          { status: 400 }
        );
      }
      throw parseError;
    }

    const updated = await updateWorkoutPlanService(userId, workoutPlanId, body);

    return NextResponse.json(updated, { status: 200 });
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

    console.error("PATCH /api/workout-plans/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 }
      );
    }

    await deleteWorkoutPlanService(userId, workoutPlanId);

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

    console.error("DELETE /api/workout-plans/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
