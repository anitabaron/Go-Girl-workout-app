import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";
import {
  createProgramNoteService,
  listProgramNotesService,
} from "@/services/training-programs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const result = await listProgramNotesService(userId, id, {
      program_session_id: searchParams.get("program_session_id") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/programs/[id]/notes");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const body = await request.json();

    const note = await createProgramNoteService(userId, id, body);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/programs/[id]/notes");
  }
}
