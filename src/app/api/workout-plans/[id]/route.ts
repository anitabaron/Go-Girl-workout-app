import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/api-route-utils";
import { getUserIdFromSession } from "@/lib/auth-api";
import {
  deleteWorkoutPlanService,
  getWorkoutPlanService,
  updateWorkoutPlanService,
} from "@/services/workout-plans";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 },
      );
    }

    const workoutPlan = await getWorkoutPlanService(userId, workoutPlanId);

    return NextResponse.json(workoutPlan, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/workout-plans/[id]");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 },
      );
    }

    // Check if request has body
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "Content-Type musi być application/json." },
        { status: 400 },
      );
    }

    // Safely parse JSON body
    let body: unknown;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json(
          { message: "Body żądania nie może być puste." },
          { status: 400 },
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return NextResponse.json(
          { message: "Nieprawidłowy format JSON w body żądania." },
          { status: 400 },
        );
      }
      throw parseError;
    }

    const updated = await updateWorkoutPlanService(userId, workoutPlanId, body);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/workout-plans/[id]");
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const workoutPlanId = id ?? new URL(request.url).searchParams.get("id");

    if (!workoutPlanId) {
      return NextResponse.json(
        { message: "Brak identyfikatora planu treningowego w ścieżce." },
        { status: 400 },
      );
    }

    await deleteWorkoutPlanService(userId, workoutPlanId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/workout-plans/[id]");
  }
}
