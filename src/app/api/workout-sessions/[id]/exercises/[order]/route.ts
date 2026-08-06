import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  autosaveWorkoutSessionExerciseService,
  deleteWorkoutSessionExerciseService,
} from "@/services/workout-sessions";

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

function parsePathParams(
  request: Request,
  pathParams: { id: string; order: string },
): { sessionId: string; orderNumber: number } | { error: NextResponse } {
  const sessionId =
    pathParams.id ?? new URL(request.url).searchParams.get("id");
  const orderParam =
    pathParams.order ?? new URL(request.url).searchParams.get("order");

  if (!sessionId) {
    return {
      error: NextResponse.json(
        { message: "Brak identyfikatora sesji treningowej w ścieżce." },
        { status: 400 },
      ),
    };
  }

  if (!isUuid(sessionId)) {
    return {
      error: NextResponse.json(
        { message: "Nieprawidłowy format UUID identyfikatora sesji." },
        { status: 400 },
      ),
    };
  }

  if (!orderParam) {
    return {
      error: NextResponse.json(
        { message: "Brak parametru order w ścieżce." },
        { status: 400 },
      ),
    };
  }

  const orderNumber = Number.parseInt(orderParam, 10);

  if (Number.isNaN(orderNumber) || orderNumber <= 0) {
    return {
      error: NextResponse.json(
        { message: "order musi być liczbą całkowitą większą od 0." },
        { status: 400 },
      ),
    };
  }

  return { sessionId, orderNumber };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const parsedParams = parsePathParams(request, await params);
    if ("error" in parsedParams) return parsedParams.error;
    const { sessionId, orderNumber } = parsedParams;

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

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const parsedParams = parsePathParams(request, await params);
    if ("error" in parsedParams) return parsedParams.error;
    const { sessionId, orderNumber } = parsedParams;

    await deleteWorkoutSessionExerciseService(userId, sessionId, orderNumber);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/workout-sessions/[id]/exercises/[order]",
    );
  }
}
