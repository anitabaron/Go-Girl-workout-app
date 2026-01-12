import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { workoutPlanQuerySchema } from "@/lib/validation/workout-plans";
import { respondWithServiceError } from "@/lib/http/errors";
import {
  createWorkoutPlanService,
  listWorkoutPlansService,
  ServiceError,
} from "@/services/workout-plans";

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

    if (params.part) {
      queryParams.part = params.part;
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

    const parsedQuery = workoutPlanQuerySchema.parse(queryParams);

    const result = await listWorkoutPlansService(userId, parsedQuery);

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

    console.error("GET /api/workout-plans unexpected error", error);
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

    const body = await request.json();
    const created = await createWorkoutPlanService(userId, body);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return respondWithServiceError(error);
    }

    console.error("POST /api/workout-plans unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 }
    );
  }
}
