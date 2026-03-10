import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { listTrainingProgramsService } from "@/services/training-programs";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const url = new URL(request.url);

    const result = await listTrainingProgramsService(userId, {
      status: (url.searchParams.get("status") as "draft" | "active" | "archived" | null) ?? undefined,
      source: (url.searchParams.get("source") as "ai" | "manual" | null) ?? undefined,
      limit: url.searchParams.get("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/programs");
  }
}
