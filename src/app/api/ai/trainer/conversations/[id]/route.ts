import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { getAITrainerConversationDetailsService } from "@/services/ai-trainer";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, context: { params: Params }) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await context.params;
    const conversation = await getAITrainerConversationDetailsService(userId, id);
    return NextResponse.json(conversation, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/trainer/conversations/[id]");
  }
}
