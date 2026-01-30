import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

import { handleRouteError } from "@/lib/api-route-utils";
import { ServiceError } from "@/lib/service-utils";

/**
 * Testy jednostkowe dla handleRouteError
 *
 * Centralna obsługa błędów API routes: UNAUTHORIZED, ServiceError, ZodError, 500.
 */

vi.mock("@/lib/http/errors", () => ({
  respondWithServiceError: vi.fn((error: ServiceError) => {
    const statusMap: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL: 500,
    };
    const status = statusMap[error.code] ?? 500;
    return new Response(
      JSON.stringify({ message: error.message, code: error.code }),
      { status },
    );
  }),
}));

describe("handleRouteError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("UNAUTHORIZED", () => {
    it("should return 401 when error message is UNAUTHORIZED", async () => {
      const result = handleRouteError(new Error("UNAUTHORIZED"));

      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.code).toBe("UNAUTHORIZED");
      expect(body.message).toContain("autoryzacji");
    });
  });

  describe("ServiceError", () => {
    it("should delegate to respondWithServiceError for ServiceError", async () => {
      const error = new ServiceError("NOT_FOUND", "Plan nie istnieje");
      const result = handleRouteError(error);

      expect(result.status).toBe(404);
      const body = await result.json();
      expect(body.code).toBe("NOT_FOUND");
      expect(body.message).toBe("Plan nie istnieje");
    });

    it("should return 409 for CONFLICT ServiceError", async () => {
      const error = new ServiceError("CONFLICT", "Konflikt unikalności");
      const result = handleRouteError(error);

      expect(result.status).toBe(409);
      const body = await result.json();
      expect(body.code).toBe("CONFLICT");
    });
  });

  describe("ZodError", () => {
    it("should return 400 with details for ZodError", async () => {
      const schema = z.object({
        limit: z.number(),
        sort: z.enum(["asc", "desc"]),
      });
      const parseResult = schema.safeParse({ limit: "invalid", sort: "x" });
      if (parseResult.success) throw new Error("Expected parse to fail");
      const zodError = parseResult.error;

      const result = handleRouteError(zodError);

      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.code).toBe("BAD_REQUEST");
      expect(body.message).toContain("Nieprawidłowe");
      expect(body.details).toBeTruthy();
    });
  });

  describe("generic error (500)", () => {
    it("should return 500 for unknown Error", async () => {
      const result = handleRouteError(new Error("Something went wrong"));

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.message).toBe("Wystąpił błąd serwera.");
      expect(body.details).toBe("Something went wrong");
    });

    it("should return 500 for non-Error throwable", async () => {
      const result = handleRouteError("string error");

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.message).toBe("Wystąpił błąd serwera.");
      expect(body.details).toBe("string error");
    });

    it("should log error with context when provided", async () => {
      const consoleSpy = vi.spyOn(console, "error");
      handleRouteError(new Error("Unexpected"), "GET /api/exercises");

      expect(consoleSpy).toHaveBeenCalledWith(
        "GET /api/exercises",
        expect.any(Error),
      );
    });
  });
});
