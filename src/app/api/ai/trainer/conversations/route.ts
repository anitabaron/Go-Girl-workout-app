import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { listAITrainerConversationsService } from "@/services/ai-trainer";

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    const conversations = await listAITrainerConversationsService(userId);
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/trainer/conversations");
  }
}
