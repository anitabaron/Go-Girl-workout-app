import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { getAITrainerUsageService } from "@/services/ai-trainer";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const hostname =
      request.headers.get("host") ?? new URL(request.url).hostname ?? null;
    const usage = await getAITrainerUsageService(userId, hostname);
    return NextResponse.json({ usage }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/trainer/usage");
  }
}
