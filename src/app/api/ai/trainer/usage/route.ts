import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { getAITrainerUsageService } from "@/services/ai-trainer";

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    const usage = await getAITrainerUsageService(userId);
    return NextResponse.json({ usage }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/trainer/usage");
  }
}
