import { describe, it, expect } from "vitest";

import { parseApiValidationErrors } from "@/lib/form/parse-api-validation-errors";

/**
 * Testy jednostkowe dla parseApiValidationErrors
 *
 * Funkcja czysta – mapuje komunikaty błędów API na fieldErrors i formErrors.
 * Używana przez use-workout-plan-form i use-exercise-form.
 */

const defaultFieldMapping = {
  name: "name",
  description: "description",
  part: "part",
};

describe("parseApiValidationErrors", () => {
  describe("field mapping", () => {
    it("should assign error to field when message contains field name", () => {
      const result = parseApiValidationErrors(
        "Pole name jest wymagane",
        undefined,
        { name: "name" },
      );

      expect(result.fieldErrors).toEqual({ name: "Pole name jest wymagane" });
      expect(result.formErrors).toEqual([]);
    });

    it("should map API field names to form field names", () => {
      const result = parseApiValidationErrors("name is required", undefined, {
        name: "name",
      });

      expect(result.fieldErrors).toEqual({ name: "name is required" });
      expect(result.formErrors).toEqual([]);
    });

    it("should handle underscore in API field names (normalized to space)", () => {
      const result = parseApiValidationErrors(
        "exercise part jest wymagane",
        undefined,
        { exercise_part: "part" },
      );

      expect(result.fieldErrors).toEqual({
        part: "exercise part jest wymagane",
      });
      expect(result.formErrors).toEqual([]);
    });

    it("should assign multiple errors to multiple fields", () => {
      const result = parseApiValidationErrors(
        "name is required; description is too short",
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors.name).toBe("name is required");
      expect(result.fieldErrors.description).toBe("description is too short");
      expect(result.formErrors).toEqual([]);
    });
  });

  describe("semicolon-separated messages", () => {
    it("should split message by semicolon", () => {
      const result = parseApiValidationErrors(
        "name error; description error; part error",
        undefined,
        { name: "name", description: "description", part: "part" },
      );

      expect(
        Object.keys(result.fieldErrors).length + result.formErrors.length,
      ).toBe(3);
    });

    it("should preserve message content as split by semicolon", () => {
      const result = parseApiValidationErrors(
        "name required; description required",
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors.name).toBe("name required");
      expect(result.fieldErrors.description).toBe("description required");
    });

    it("should filter empty messages", () => {
      const result = parseApiValidationErrors(
        "name required; ; ; description required",
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors.name).toBe("name required");
      expect(result.fieldErrors.description).toBe("description required");
    });
  });

  describe("form errors (unassigned messages)", () => {
    it("should put unassigned messages in formErrors", () => {
      const result = parseApiValidationErrors(
        "Nieznany błąd walidacji",
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors).toEqual({});
      expect(result.formErrors).toEqual(["Nieznany błąd walidacji"]);
    });

    it("should add details to formErrors when not in message list", () => {
      const result = parseApiValidationErrors(
        "Nazwa wymagana",
        "Dodatkowy kontekst błędu",
        defaultFieldMapping,
      );

      expect(result.formErrors).toContain("Dodatkowy kontekst błędu");
    });

    it("should not duplicate details when already in message", () => {
      const result = parseApiValidationErrors(
        "name required",
        "name required",
        defaultFieldMapping,
      );

      expect(result.formErrors).not.toContain("name required");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined message and details", () => {
      const result = parseApiValidationErrors(
        undefined,
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors).toEqual({});
      expect(result.formErrors).toEqual([]);
    });

    it("should handle empty string message", () => {
      const result = parseApiValidationErrors(
        "",
        undefined,
        defaultFieldMapping,
      );

      expect(result.fieldErrors).toEqual({});
      expect(result.formErrors).toEqual([]);
    });

    it("should handle empty field mapping", () => {
      const result = parseApiValidationErrors("Dowolny błąd", undefined, {});

      expect(result.fieldErrors).toEqual({});
      expect(result.formErrors).toEqual(["Dowolny błąd"]);
    });

    it("should match field names case-insensitively", () => {
      const result = parseApiValidationErrors(
        "NAME field is required",
        undefined,
        { name: "name" },
      );

      expect(result.fieldErrors).toEqual({ name: "NAME field is required" });
    });
  });
});
