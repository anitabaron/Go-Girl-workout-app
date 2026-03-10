import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import {
  recoverWorkoutPlansFromRecentSessionsService,
  recoverWorkoutPlansFromSessionsService,
} from "@/services/workout-plans";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    const result = await recoverWorkoutPlansFromSessionsService(userId, body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-plans/recover-from-sessions");
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const url = new URL(request.url);
    const recentRaw = url.searchParams.get("recent");
    if (recentRaw) {
      const recent = Number(recentRaw);
      const result = await recoverWorkoutPlansFromRecentSessionsService(
        userId,
        Number.isFinite(recent) ? recent : 2,
      );
      return NextResponse.json(result, { status: 200 });
    }

    const idsRaw = url.searchParams.get("session_ids") ?? "";
    const sessionIds = idsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await recoverWorkoutPlansFromSessionsService(userId, {
      session_ids: sessionIds,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/workout-plans/recover-from-sessions");
  }
}
