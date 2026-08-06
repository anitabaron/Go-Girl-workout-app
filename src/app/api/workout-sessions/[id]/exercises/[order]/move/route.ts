import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { moveWorkoutSessionExerciseService } from "@/services/workout-sessions";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
    order: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id: sessionId, order: orderParam } = await params;

    if (!sessionId || !isUuid(sessionId)) {
      return NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      );
    }

    const orderNumber = Number.parseInt(orderParam, 10);
    if (Number.isNaN(orderNumber) || orderNumber <= 0) {
      return NextResponse.json(
        { message: "order musi być liczbą całkowitą większą od 0." },
        { status: 400 },
      );
    }

    let body: { direction?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    if (body.direction !== "up" && body.direction !== "down") {
      return NextResponse.json(
        { message: "direction musi być 'up' albo 'down'." },
        { status: 400 },
      );
    }

    await moveWorkoutSessionExerciseService(
      userId,
      sessionId,
      orderNumber,
      body.direction,
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/workout-sessions/[id]/exercises/[order]/move",
    );
  }
}
