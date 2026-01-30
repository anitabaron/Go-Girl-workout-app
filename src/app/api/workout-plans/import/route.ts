import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { importWorkoutPlanService } from "@/services/workout-plans";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();

    const result = await importWorkoutPlanService(userId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-plans/import");
  }
}
