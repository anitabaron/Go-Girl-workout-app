import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  getWorkoutSessionService,
  deleteWorkoutSessionService,
} from "@/services/workout-sessions";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
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
        { status: 400 },
      );
    }

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      );
    }

    const session = await getWorkoutSessionService(userId, sessionId);

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/workout-sessions/[id]");
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
        { status: 400 },
      );
    }

    if (!isUuid(sessionId)) {
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      );
    }

    await deleteWorkoutSessionService(userId, sessionId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/workout-sessions/[id]");
  }
}
