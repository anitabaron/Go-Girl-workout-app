import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { patchProgramSessionService } from "@/services/training-programs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const body = await request.json();

    const result = await patchProgramSessionService(userId, id, body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/program-sessions/[id]");
  }
}
