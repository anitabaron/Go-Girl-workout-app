import { NextResponse } from "next/server";

import { createClient } from "@/db/supabase.server";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  deleteExerciseService,
  getExerciseService,
  ServiceError,
  updateExerciseService,
} from "@/services/exercises";

async function getUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    const exercise = await getExerciseService(userId, params.id);

    return NextResponse.json(exercise, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("GET /api/exercises/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updated = await updateExerciseService(userId, params.id, body);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("PATCH /api/exercises/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    await deleteExerciseService(userId, params.id);

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("DELETE /api/exercises/[id] unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
