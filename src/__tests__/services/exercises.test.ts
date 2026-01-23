import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createExerciseService,
  ServiceError,
} from '@/services/exercises';
import type { ExerciseDTO } from '@/types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import * as supabaseServer from '@/db/supabase.server';
import * as exercisesRepo from '@/repositories/exercises';
import * as exercisesValidation from '@/lib/validation/exercises';

/**
 * Testy jednostkowe dla funkcji serwisowej createExerciseService
 * 
 * Priorytet: ŚREDNI
 * Wymaga mockowania zależności (Supabase, repository)
 * Zawiera logikę biznesową i orkiestrację
 */

// Mock zależności na poziomie modułu (factory pattern)
vi.mock('@/db/supabase.server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/repositories/exercises', () => ({
  findByNormalizedTitle: vi.fn(),
  insertExercise: vi.fn(),
}));

vi.mock('@/lib/validation/exercises', async () => {
  const actual = await vi.importActual<typeof exercisesValidation>(
    '@/lib/validation/exercises'
  );
  return {
    ...actual,
    // Use actual normalizeTitle implementation to test real normalization behavior
    normalizeTitle: vi.fn(actual.normalizeTitle),
    validateExerciseBusinessRules: vi.fn(() => []),
  };
});

describe('createExerciseService', () => {
  const mockUserId = 'user-123';
  const mockSupabase = {} as SupabaseClient<Database>;

  const mockExerciseDTO: ExerciseDTO = {
    id: 'exercise-1',
    title: 'Przysiady',
    type: 'Main Workout',
    part: 'Legs',
    series: 3,
    reps: 10,
    rest_in_between_seconds: 60,
    details: null,
    duration_seconds: null,
    estimated_set_time_seconds: null,
    level: null,
    rest_after_series_seconds: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const validPayload = {
    title: 'Przysiady',
    type: 'Main Workout' as const,
    part: 'Legs' as const,
    series: 3,
    reps: 10,
    rest_in_between_seconds: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase);
    // Reset validation to return empty array by default (valid input)
    vi.mocked(exercisesValidation.validateExerciseBusinessRules).mockReturnValue([]);
    // Reset normalizeTitle to actual implementation (already using actual in mock)
  });

  describe('poprawne tworzenie ćwiczenia', () => {
    it('should create exercise when valid data provided and no duplicate exists', async () => {
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
        'przysiady' // normalized title
      );
      expect(exercisesRepo.insertExercise).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        validPayload
      );
    });

    it('should normalize title before checking for duplicates', async () => {
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
        title: '  Przysiady Z Obciążeniem  ',
      };

      // Act
      await createExerciseService(mockUserId, payloadWithDiacritics);

      // Assert
      // Verify that normalizeTitle was called (exact arguments may vary due to schema processing)
      expect(exercisesValidation.normalizeTitle).toHaveBeenCalled();
      // Verify that findByNormalizedTitle was called with normalized title (diacritics removed)
      expect(exercisesRepo.findByNormalizedTitle).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        'przysiady z obciazeniem' // normalized: "ą" → "a"
      );
    });
  });

  describe('walidacja biznesowa', () => {
    it('should validate business rules before creating exercise', async () => {
      // Arrange
      vi.mocked(exercisesValidation.validateExerciseBusinessRules).mockReturnValue([
        'Podaj dokładnie jedno z pól: reps lub duration_seconds.',
      ]);

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Podaj dokładnie jedno z pól'),
      });

      expect(exercisesRepo.insertExercise).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST with all validation errors joined', async () => {
      // Arrange
      vi.mocked(exercisesValidation.validateExerciseBusinessRules).mockReturnValue([
        'Error 1',
        'Error 2',
        'Error 3',
      ]);

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Error 1 Error 2 Error 3',
      });
    });
  });

  describe('sprawdzanie duplikatów', () => {
    it('should throw CONFLICT when duplicate title exists (normalized)', async () => {
      // Arrange
      const existingExercise = { ...mockExerciseDTO, id: 'existing-1' };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: existingExercise,
        error: null,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Ćwiczenie o podanym tytule już istnieje.',
      });
    });

    it('should check for duplicate even when title has different case', async () => {
      // Arrange
      const existingExercise = { ...mockExerciseDTO, id: 'existing-1' };

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: existingExercise,
        error: null,
      });

      const payloadWithDifferentCase = {
        ...validPayload,
        title: 'PRZYSIADY', // uppercase, but normalized to same value
      };

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, payloadWithDifferentCase)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, payloadWithDifferentCase)
      ).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('obsługa błędów bazy danych', () => {
    it('should map database errors correctly when findByNormalizedTitle fails', async () => {
      // Arrange
      const dbError = {
        name: 'PostgrestError',
        code: '23505',
        message: 'Duplicate key violation',
        details: 'Key (title_normalized) already exists',
        hint: null,
      } as unknown as PostgrestError;

      vi.mocked(exercisesRepo.findByNormalizedTitle).mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Ćwiczenie o podanym tytule już istnieje.',
      });
    });

    it('should map database errors when insertExercise fails', async () => {
      // Arrange
      const dbError = {
        name: 'PostgrestError',
        code: '23503',
        message: 'Foreign key violation',
        details: 'Referenced row does not exist',
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
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Operacja narusza istniejące powiązania.',
      });
    });

    it('should throw INTERNAL error when insertExercise returns no data', async () => {
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
        createExerciseService(mockUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(mockUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'INTERNAL',
        message: 'Nie udało się utworzyć ćwiczenia.',
      });
    });
  });

  describe('autoryzacja', () => {
    it('should throw UNAUTHORIZED when userId is empty string', async () => {
      // Arrange
      const emptyUserId = '';

      // Act & Assert
      await expect(
        createExerciseService(emptyUserId, validPayload)
      ).rejects.toThrow(ServiceError);

      await expect(
        createExerciseService(emptyUserId, validPayload)
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Brak aktywnej sesji.',
      });
    });
  });

  describe('warunki brzegowe', () => {
    it('should handle payload with all optional fields', async () => {
      // Arrange
      const fullPayload = {
        ...validPayload,
        level: 'Beginner',
        details: 'Detailed description',
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
        fullPayload
      );
    });

    it('should handle very long title (within limits)', async () => {
      // Arrange
      const longTitlePayload = {
        ...validPayload,
        title: 'A'.repeat(120), // max length
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
