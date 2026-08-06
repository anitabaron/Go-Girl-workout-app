import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { repeatWorkoutSessionService } from "@/services/workout-sessions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    const result = await repeatWorkoutSessionService(userId, id);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/workout-sessions/[id]/repeat");
  }
}
