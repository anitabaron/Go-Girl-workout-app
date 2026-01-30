import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getUserIdFromSession } from "@/lib/auth-api";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  listWorkoutSessionsService,
  startWorkoutSessionService,
  ServiceError,
} from "@/services/workout-sessions";
import { sessionListQuerySchema } from "@/lib/validation/workout-sessions";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();

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

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Nieprawidłowe parametry zapytania.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 },
      );
    }

    console.error("GET /api/workout-sessions unexpected error", error);
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromSession();

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("POST /api/workout-sessions JSON parse error", jsonError);
      return NextResponse.json(
        {
          message: "Nieprawidłowy format JSON w body żądania.",
          code: "BAD_REQUEST",
        },
        { status: 400 },
      );
    }

    const { session, isNew } = await startWorkoutSessionService(userId, body);

    return NextResponse.json(session, { status: isNew ? 201 : 200 });
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
      console.error(
        "POST /api/workout-sessions ServiceError:",
        error.code,
        error.message,
        error.details,
      );
      return respondWithServiceError(error);
    }

    if (error instanceof ZodError) {
      console.error("POST /api/workout-sessions ZodError:", error.issues);
      return NextResponse.json(
        {
          message: "Nieprawidłowe dane wejściowe.",
          code: "BAD_REQUEST",
          details: error.issues.map((issue) => issue.message).join("; "),
        },
        { status: 400 },
      );
    }

    console.error("POST /api/workout-sessions unexpected error", error);
    return NextResponse.json(
      {
        message: "Wystąpił błąd serwera.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
