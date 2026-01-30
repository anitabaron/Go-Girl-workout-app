import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import { getExerciseByTitleService, ServiceError } from "@/services/exercises";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const title = url.searchParams.get("title");

    if (!title) {
      return NextResponse.json(
        { message: "Parametr 'title' jest wymagany." },
        { status: 400 },
      );
    }

    const exercise = await getExerciseByTitleService(userId, title);

    if (!exercise) {
      return NextResponse.json(
        { message: "Ćwiczenie nie zostało znalezione." },
        { status: 404 },
      );
    }

    return NextResponse.json(exercise, { status: 200 });
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
      return respondWithServiceError(error);
    }

    console.error("GET /api/exercises/by-title unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
