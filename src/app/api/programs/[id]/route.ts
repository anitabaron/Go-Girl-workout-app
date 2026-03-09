import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import {
  deleteTrainingProgramService,
  getTrainingProgramService,
  patchTrainingProgramService,
} from "@/services/training-programs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    const result = await getTrainingProgramService(userId, id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/programs/[id]");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const body = await request.json();

    const result = await patchTrainingProgramService(userId, id, body);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/programs/[id]");
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    await deleteTrainingProgramService(userId, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/programs/[id]");
  }
}
