import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  createExerciseService,
  listExercisesService,
} from "@/services/exercises";
import { exerciseQuerySchema } from "@/lib/validation/exercises";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = exerciseQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    const result = await listExercisesService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/exercises");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const body = await request.json();
    const created = await createExerciseService(userId, body);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/exercises");
  }
}
