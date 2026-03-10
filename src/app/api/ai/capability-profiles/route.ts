import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import {
  listCapabilityProfilesService,
  upsertCapabilityProfileService,
} from "@/services/capability-profiles";

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    const items = await listCapabilityProfilesService(userId);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/capability-profiles");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();
    const profile = await upsertCapabilityProfileService(userId, body);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "POST /api/ai/capability-profiles");
  }
}
