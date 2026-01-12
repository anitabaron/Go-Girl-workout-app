import { NextResponse } from "next/server";

import type { ServiceError as ExerciseServiceError } from "@/services/exercises";
import type { ServiceError as WorkoutPlanServiceError } from "@/services/workout-plans";

type ServiceError = ExerciseServiceError | WorkoutPlanServiceError;

type ErrorBody = {
  message: string;
  code?: string;
  details?: string;
};

const STATUS_MAP: Record<ServiceError["code"], number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

export function respondWithServiceError(error: ServiceError) {
  const status = STATUS_MAP[error.code] ?? 500;
  const body: ErrorBody = {
    message: error.message,
    code: error.code,
  };

  if (error.details) {
    body.details = error.details;
  }

  return NextResponse.json(body, { status });
}
