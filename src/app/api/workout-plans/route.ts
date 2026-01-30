import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  createWorkoutPlanService,
  listWorkoutPlansService,
} from "@/services/workout-plans";
import { workoutPlanQuerySchema } from "@/lib/validation/workout-plans";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = workoutPlanQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    const result = await listWorkoutPlansService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/workout-plans");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const body = await request.json();
    const created = await createWorkoutPlanService(userId, body);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-plans");
  }
}
