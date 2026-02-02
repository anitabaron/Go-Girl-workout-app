import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import { updatePersonalRecordService } from "@/services/personal-records";
import {
  personalRecordUpdateSchema,
} from "@/lib/validation/personal-records";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Brak identyfikatora rekordu w ścieżce." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = personalRecordUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Nieprawidłowe dane wejściowe.",
          details: parsed.error.issues.map((i) => i.message).join("; "),
        },
        { status: 400 },
      );
    }

    const data = await updatePersonalRecordService(userId, id, parsed.data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/personal-records/record/[id]",
    );
  }
}
