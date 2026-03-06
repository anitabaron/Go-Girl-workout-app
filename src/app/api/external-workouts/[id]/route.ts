import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { validateUuid } from "@/lib/service-utils";
import {
  deleteExternalWorkoutService,
  updateExternalWorkoutService,
} from "@/services/external-workouts";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutId) {
      return NextResponse.json(
        { message: "Brak identyfikatora treningu w ścieżce." },
        { status: 400 },
      );
    }

    validateUuid(workoutId, "id");

    const body = await request.json();
    const updated = await updateExternalWorkoutService(userId, workoutId, body);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/external-workouts/[id]");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutId) {
      return NextResponse.json(
        { message: "Brak identyfikatora treningu w ścieżce." },
        { status: 400 },
      );
    }

    validateUuid(workoutId, "id");
    await deleteExternalWorkoutService(userId, workoutId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/external-workouts/[id]");
  }
}
