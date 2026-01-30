import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { respondWithServiceError } from "@/lib/http/errors";
import { ServiceError } from "@/lib/service-utils";

/**
 * Centralna obsługa błędów dla API route handlers.
 * Obsługuje: UNAUTHORIZED, ServiceError, ZodError oraz generyczne błędy 500.
 *
 * @param error - Błąd złapany w catch
 * @param context - Opcjonalny kontekst do logowania (np. "GET /api/exercises")
 */
export function handleRouteError(
  error: unknown,
  context?: string,
): NextResponse {
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
        message: "Nieprawidłowe dane wejściowe.",
        code: "BAD_REQUEST",
        details: error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 },
    );
  }

  console.error(context ?? "API route unexpected error", error);
  return NextResponse.json(
    {
      message: "Wystąpił błąd serwera.",
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}
