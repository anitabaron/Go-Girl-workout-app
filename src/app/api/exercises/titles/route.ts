import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { listExerciseTitlesService } from "@/services/exercises";

/**
 * GET /api/exercises/titles
 * Zwraca listę ćwiczeń z polami id i title (lżejszy payload dla filtrów/selectów).
 * Sortowanie po tytule asc, limit 50.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(1, Number(limitParam) || 50), 50);

    const items = await listExerciseTitlesService(userId, limit);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/exercises/titles");
  }
}
