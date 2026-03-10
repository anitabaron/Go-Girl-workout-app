import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { aiTrainerChatService } from "@/services/ai-trainer";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    const hostname =
      request.headers.get("host") ?? new URL(request.url).hostname ?? null;

    const result = await aiTrainerChatService(userId, body, hostname);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "POST /api/ai/trainer/chat");
  }
}
