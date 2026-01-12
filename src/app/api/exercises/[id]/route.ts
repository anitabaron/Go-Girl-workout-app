import { NextResponse } from "next/server";

import { respondWithServiceError } from "@/lib/http/errors";
import {
  deleteExerciseService,
  getExerciseService,
  ServiceError,
  updateExerciseService,
} from "@/services/exercises";

function getUserId() {
  return process.env.DEFAULT_USER_ID ?? null;
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
    const userId = getUserId();

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
    const userId = getUserId();

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
    const userId = getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Brak aktywnej sesji." },
        { status: 401 }
      );
    }

    await deleteExerciseService(userId, params.id);

    return new Response(null, { status: 204 });
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
