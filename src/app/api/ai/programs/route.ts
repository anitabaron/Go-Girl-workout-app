import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import { createTrainingProgramService } from "@/services/training-programs";

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const body = await request.json();

    const program = await createTrainingProgramService(userId, body);
    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/ai/programs");
  }
}
