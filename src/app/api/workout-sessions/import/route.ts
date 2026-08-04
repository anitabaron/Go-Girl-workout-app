import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { importWorkoutSessionService } from "@/services/workout-sessions";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();

    const result = await importWorkoutSessionService(userId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-sessions/import");
  }
}
