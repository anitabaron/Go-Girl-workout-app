import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { listProgramSessionsService } from "@/services/training-programs";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const url = new URL(request.url);

    const result = await listProgramSessionsService(userId, {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      status: (url.searchParams.get("status") as "planned" | "completed" | null) ?? undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/program-sessions");
  }
}
