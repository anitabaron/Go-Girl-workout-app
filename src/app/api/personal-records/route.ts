import { NextResponse } from "next/server";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  listPersonalRecordsService,
  ServiceError,
} from "@/services/personal-records";
import { personalRecordQuerySchema } from "@/lib/validation/personal-records";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = personalRecordQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });

    const result = await listPersonalRecordsService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Brak autoryzacji. Zaloguj się ponownie.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("GET /api/personal-records unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
