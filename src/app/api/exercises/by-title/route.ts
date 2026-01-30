import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { getExerciseByTitleService } from "@/services/exercises";

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
    return handleRouteError(error, "GET /api/exercises/by-title");
  }
}
