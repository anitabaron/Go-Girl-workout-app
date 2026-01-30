import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  deleteExerciseService,
  getExerciseService,
  updateExerciseService,
} from "@/services/exercises";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 },
      );
    }

    const exercise = await getExerciseService(userId, exerciseId);

    return NextResponse.json(exercise, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/exercises/[id]");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updated = await updateExerciseService(userId, exerciseId, body);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/exercises/[id]");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const exerciseId = id ?? new URL(request.url).searchParams.get("id");

    if (!exerciseId) {
      return NextResponse.json(
        { message: "Brak identyfikatora ćwiczenia w ścieżce." },
        { status: 400 },
      );
    }

    await deleteExerciseService(userId, exerciseId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/exercises/[id]");
  }
}
