import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExerciseService,
  listExerciseTitlesService,
  ServiceError,
} from "@/services/exercises";
import type { ExerciseDTO } from "@/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import * as supabaseServer from "@/db/supabase.server";
import * as exercisesRepo from "@/repositories/exercises";
import * as exercisesValidation from "@/lib/validation/exercises";

/**
 * Testy jednostkowe dla funkcji serwisowej createExerciseService
 *
 * Priorytet: ŚREDNI
 * Wymaga mockowania zależności (Supabase, repository)
 * Zawiera logikę biznesową i orkiestrację
 */

// Mock zależności na poziomie modułu (factory pattern)
vi.mock("@/db/supabase.server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/repositories/exercises", () => ({
  findByNormalizedTitle: vi.fn(),
  insertExercise: vi.fn(),
  listExerciseTitles: vi.fn(),
}));

vi.mock("@/lib/validation/exercises", async () => {
  const actual = await vi.importActual<typeof exercisesValidation>(
    "@/lib/validation/exercises",
  );
  return {
    ...actual,
    // Use actual normalizeTitleForDbLookup (matches DB title_normalized: no diacritic stripping)
    normalizeTitleForDbLookup: vi.fn(actual.normalizeTitleForDbLookup),
    validateExerciseBusinessRules: vi.fn(() => []),
  };
});

describe("createExerciseService", () => {
  const mockUserId = "user-123";
  const mockSupabase = {} as SupabaseClient<Database>;

  const mockExerciseDTO: ExerciseDTO = {
    id: "exercise-1",
    title: "Przysiady",
    types: ["Main Workout"],
    parts: ["Legs"],
    type: "Main Workout",
    part: "Legs",
    is_unilateral: false,
    is_save_to_pr: false,
    series: 3,
    reps: 10,
    rest_in_between_seconds: 60,
    details: null,
    duration_seconds: null,
    estimated_set_time_seconds: null,
    level: null,
    rest_after_series_seconds: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const validPayload = {
    title: "Przysiady",
    types: ["Main Workout"] as const,
    parts: ["Legs"] as const,
    series: 3,
    reps: 10,
    rest_in_between_seconds: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase);
    // Reset validation to return empty array by default (valid input)
    vi.mocked(
      exercisesValidation.validateExerciseBusinessRules,
    ).mockReturnValue([]);
    // Reset normalizeTitle to actual implementation (already using actual in mock)
  });

  describe("poprawne tworzenie ćwiczenia", () => {
    it("should create exercise when valid data provided and no duplicate exists", async () => {
      // Arrange
      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: mockExerciseDTO,
        error: null,
      });

      // Act
      const result = await createExerciseService(mockUserId, validPayload);

      // Assert
      expect(result).toEqual(mockExerciseDTO);
      expect(exercisesRepo.findByNormalizedTitle).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        "przysiady", // normalized title
      );
      expect(exercisesRepo.insertExercise).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        { ...validPayload, is_unilateral: false, is_save_to_pr: true },
      );
    });

    it("should normalize title before checking for duplicates", async () => {
      // Arrange
      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: mockExerciseDTO,
        error: null,
      });

      const payloadWithDiacritics = {
        ...validPayload,
        title: "  Przysiady Z Obciążeniem  ",
      };

      // Act
      await createExerciseService(mockUserId, payloadWithDiacritics);

      // Assert
      expect(exercisesValidation.normalizeTitleForDbLookup).toHaveBeenCalled();
      // Verify that findByNormalizedTitle was called with DB-style normalized title (lower, trim, collapse spaces; diacritics kept)
      expect(exercisesRepo.findByNormalizedTitle).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        "przysiady z obciążeniem", // normalizeTitleForDbLookup: lowercase + trim, ą kept (matches PostgreSQL title_normalized)
      );
    });
  });

  describe("walidacja biznesowa", () => {
    it("should validate business rules before creating exercise", async () => {
      // Arrange
      vi.mocked(
        exercisesValidation.validateExerciseBusinessRules,
      ).mockReturnValue([
        "Podaj dokładnie jedno z pól: reps lub duration_seconds.",
      ]);

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("Podaj dokładnie jedno z pól"),
      });

      expect(exercisesRepo.insertExercise).not.toHaveBeenCalled();
    });

    it("should throw BAD_REQUEST with all validation errors joined", async () => {
      // Arrange
      vi.mocked(
        exercisesValidation.validateExerciseBusinessRules,
      ).mockReturnValue(["Error 1", "Error 2", "Error 3"]);

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Error 1 Error 2 Error 3",
      });
    });
  });

  describe("sprawdzanie duplikatów", () => {
    it("should throw CONFLICT when duplicate title exists (normalized)", async () => {
      // Arrange
      const existingExercise = { ...mockExerciseDTO, id: "existing-1" };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: existingExercise,
        error: null,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Ćwiczenie o podanym tytule już istnieje.",
      });
    });

    it("should check for duplicate even when title has different case", async () => {
      // Arrange
      const existingExercise = { ...mockExerciseDTO, id: "existing-1" };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: existingExercise,
        error: null,
      });

      const payloadWithDifferentCase = {
        ...validPayload,
        title: "PRZYSIADY", // uppercase, but normalized to same value
      };

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, payloadWithDifferentCase),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, payloadWithDifferentCase),
      ).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  describe("obsługa błędów bazy danych", () => {
    it("should map database errors correctly when findByNormalizedTitle fails", async () => {
      // Arrange
      const dbError = {
        name: "PostgrestError",
        code: "23505",
        message: "Duplicate key violation",
        details: "Key (title_normalized) already exists",
        hint: null,
      } as unknown as PostgrestError;

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Ćwiczenie o podanym tytule już istnieje.",
      });
    });

    it("should map database errors when insertExercise fails", async () => {
      // Arrange
      const dbError = {
        name: "PostgrestError",
        code: "23503",
        message: "Foreign key violation",
        details: "Referenced row does not exist",
        hint: null,
      } as unknown as PostgrestError;

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Operacja narusza istniejące powiązania.",
      });
    });

    it("should throw INTERNAL error when insertExercise returns no data", async () => {
      // Arrange
      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload),
      ).rejects.toMatchObject({
        code: "INTERNAL",
        message: "Nie udało się utworzyć ćwiczenia.",
      });
    });
  });

  describe("autoryzacja", () => {
    it("should throw UNAUTHORIZED when userId is empty string", async () => {
      // Arrange
      const emptyUserId = "";

      // Act & Assert
      await expect(
        createExerciseService(emptyUserId, validPayload),
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(emptyUserId, validPayload),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Brak aktywnej sesji.",
      });
    });
  });

  describe("warunki brzegowe", () => {
    it("should handle payload with all optional fields", async () => {
      // Arrange
      const fullPayload = {
        ...validPayload,
        level: "Beginner",
        details: "Detailed description",
        duration_seconds: null,
        rest_after_series_seconds: 120,
        estimated_set_time_seconds: 30,
      };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: mockExerciseDTO,
        error: null,
      });

      // Act
      const result = await createExerciseService(mockUserId, fullPayload);

      // Assert
      expect(result).toEqual(mockExerciseDTO);
      expect(exercisesRepo.insertExercise).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        { ...fullPayload, is_unilateral: false, is_save_to_pr: true },
      );
    });

    it("should handle very long title (within limits)", async () => {
      // Arrange
      const longTitlePayload = {
        ...validPayload,
        title: "A".repeat(120), // max length
      };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(exercisesRepo.insertExercise).mockResolvedValue({
        data: mockExerciseDTO,
        error: null,
      });

      // Act
      await createExerciseService(mockUserId, longTitlePayload);

      // Assert
      expect(exercisesRepo.findByNormalizedTitle).toHaveBeenCalled();
      expect(exercisesRepo.insertExercise).toHaveBeenCalled();
    });
  });
});

describe("listExerciseTitlesService", () => {
  const mockUserId = "user-123";
  const mockSupabase = {} as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase);
  });

  it("should return id and title for each exercise", async () => {
    vi.mocked(exercisesRepo.listExerciseTitles).mockResolvedValue({
      data: [
        { id: "ex-1", title: "Przysiady" },
        { id: "ex-2", title: "Pompki" },
      ],
      error: null,
    });

    const result = await listExerciseTitlesService(mockUserId, 50);

    expect(result).toEqual([
      { id: "ex-1", title: "Przysiady" },
      { id: "ex-2", title: "Pompki" },
    ]);
    expect(exercisesRepo.listExerciseTitles).toHaveBeenCalledWith(
      mockSupabase,
      mockUserId,
      50,
    );
  });

  it("should use default limit of 50 when not specified", async () => {
    vi.mocked(exercisesRepo.listExerciseTitles).mockResolvedValue({
      data: [],
      error: null,
    });

    await listExerciseTitlesService(mockUserId);

    expect(exercisesRepo.listExerciseTitles).toHaveBeenCalledWith(
      mockSupabase,
      mockUserId,
      50,
    );
  });

  it("should throw ServiceError when repository returns error", async () => {
    const dbError = {
      name: "PostgrestError",
      code: "PGRST116",
      message: "Row not found",
    } as unknown as PostgrestError;

    vi.mocked(exercisesRepo.listExerciseTitles).mockResolvedValue({
      data: [],
      error: dbError,
    });

    await expect(listExerciseTitlesService(mockUserId)).rejects.toThrow(
      ServiceError,
    );
  });
});
