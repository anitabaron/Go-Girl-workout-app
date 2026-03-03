import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  createExternalWorkoutService,
  listExternalWorkoutsService,
} from "@/services/external-workouts";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const result = await listExternalWorkoutsService(userId, {
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/external-workouts");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("POST /api/external-workouts JSON parse error", jsonError);
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    const workout = await createExternalWorkoutService(userId, body);

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/external-workouts");
  }
}
