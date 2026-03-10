import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import {
  getOrCreateAICoachProfileService,
  patchAICoachProfileService,
} from "@/services/ai-coach-profiles";

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    const profile = await getOrCreateAICoachProfileService(userId);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/coach-profile");
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();

    const profile = await patchAICoachProfileService(userId, body);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/ai/coach-profile");
  }
}
