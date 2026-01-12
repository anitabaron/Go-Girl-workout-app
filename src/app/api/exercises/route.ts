import { NextResponse } from "next/server";

import { createClient } from "@/db/supabase.server";
import { exerciseQuerySchema } from "@/lib/validation/exercises";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  createExerciseService,
  listExercisesService,
  ServiceError,
} from "@/services/exercises";

async function getUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = exerciseQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    const result = await listExercisesService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("GET /api/exercises unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const created = await createExerciseService(userId, body);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("POST /api/exercises unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
