import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { updateWorkoutSessionStatusService } from "@/services/workout-sessions";

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

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");

    if (!sessionId) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] Missing sessionId",
      );
      return NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 },
      );
    }

    if (!isUuid(sessionId)) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] Invalid sessionId format:",
        sessionId,
      );
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error(
        "[PATCH /api/workout-sessions/[id]/status] JSON parse error:",
        jsonError,
      );
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    const updated = await updateWorkoutSessionStatusService(
      userId,
      sessionId,
      body,
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/workout-sessions/[id]/status");
  }
}
