import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  deleteAITrainerConversationService,
  getAITrainerConversationDetailsService,
} from "@/services/ai-trainer";

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

export async function DELETE(_request: Request, context: { params: Params }) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await context.params;
    await deleteAITrainerConversationService(userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/ai/trainer/conversations/[id]");
  }
}
