import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { startProgramSessionService } from "@/services/training-programs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    const result = await startProgramSessionService(userId, id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "POST /api/program-sessions/[id]/start");
  }
}
