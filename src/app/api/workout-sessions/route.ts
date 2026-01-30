import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  listWorkoutSessionsService,
  startWorkoutSessionService,
} from "@/services/workout-sessions";
import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = sessionListQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    const result = await listWorkoutSessionsService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/workout-sessions");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("POST /api/workout-sessions JSON parse error", jsonError);
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    const { session, isNew } = await startWorkoutSessionService(userId, body);

    return NextResponse.json(session, { status: isNew ? 201 : 200 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-sessions");
  }
}
