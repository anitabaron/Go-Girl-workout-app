import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { autosaveWorkoutSessionExerciseService } from "@/services/workout-sessions";

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

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id, order } = await params;
    const sessionId = id ?? new URL(request.url).searchParams.get("id");
    const orderParam = order ?? new URL(request.url).searchParams.get("order");

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

    if (!orderParam) {
      return NextResponse.json(
        { message: "Brak parametru order w ścieżce." },
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

    let body;
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

    const result = await autosaveWorkoutSessionExerciseService(
      userId,
      sessionId,
      orderNumber,
      body,
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/workout-sessions/[id]/exercises/[order]",
    );
  }
}
