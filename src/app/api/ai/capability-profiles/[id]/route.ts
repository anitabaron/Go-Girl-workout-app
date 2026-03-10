import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { patchCapabilityProfileService } from "@/services/capability-profiles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const body = await request.json();

    const profile = await patchCapabilityProfileService(userId, id, body);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/ai/capability-profiles/[id]");
  }
}
