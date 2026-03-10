import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { buildTrainingStateSnapshotService } from "@/services/training-state";

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
    const snapshot = await buildTrainingStateSnapshotService(userId);
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/ai/training-state");
  }
}
