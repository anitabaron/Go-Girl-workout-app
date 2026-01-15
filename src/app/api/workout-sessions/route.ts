import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  listWorkoutSessionsService,
  startWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";

function getUserId() {
  return process.env.DEFAULT_USER_ID ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(request: Request) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Poprawne parsowanie parametrów zapytania
    const queryParams: Record<string, unknown> = {};

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.plan_id) {
      queryParams.plan_id = params.plan_id;
    }

    if (params.from) {
      queryParams.from = params.from;
    }

    if (params.to) {
      queryParams.to = params.to;
    }

    if (params.sort) {
      queryParams.sort = params.sort;
    }

    if (params.order) {
      queryParams.order = params.order;
    }

    if (params.limit) {
      const limitNum = Number(params.limit);
      if (!Number.isNaN(limitNum) && limitNum > 0) {
        queryParams.limit = limitNum;
      }
    }

    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    const parsedQuery = sessionListQuerySchema.parse(queryParams);

    const result = await listWorkoutSessionsService(userId, parsedQuery);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Nieprawidłowe parametry zapytania.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 }
      );
    }

    console.error("GET /api/workout-sessions unexpected error", error);
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId();

    if (!userId || !isUuid(userId)) {
      return NextResponse.json(
        { message: "Brak lub nieprawidłowy DEFAULT_USER_ID w środowisku." },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error(
        "POST /api/workout-sessions JSON parse error",
        jsonError
      );
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 }
      );
    }

    console.log("POST /api/workout-sessions request body:", JSON.stringify(body, null, 2));

    const { session, isNew } = await startWorkoutSessionService(userId, body);

    console.log("POST /api/workout-sessions success, isNew:", isNew, "sessionId:", session.id);

    return NextResponse.json(session, { status: isNew ? 201 : 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error(
        "POST /api/workout-sessions ServiceError:",
        error.code,
        error.message,
        error.details
      );
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      console.error(
        "POST /api/workout-sessions ZodError:",
        error.issues
      );
      return NextResponse.json(
        {
          message: "Nieprawidłowe dane wejściowe.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 }
      );
    }

    console.error("POST /api/workout-sessions unexpected error", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
