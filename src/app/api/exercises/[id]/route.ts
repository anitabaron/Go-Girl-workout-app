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
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 }
      );
    }

    const exercise = await getExerciseService(userId, exerciseId);

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

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await updateExerciseService(userId, exerciseId, body);

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

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 }
      );
    }

    await deleteExerciseService(userId, exerciseId);

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
