import { describe, it, expect } from "vitest";
import {
  normalizeTitle,
  normalizeTitleForDbLookup,
  validateExerciseBusinessRules,
} from "@/lib/validation/exercises";

/**
 * Testy jednostkowe dla funkcji walidacji ćwiczeń
 *
 * Priorytet: WYSOKI
 * Funkcje czyste (pure functions) - łatwe do testowania, brak zależności zewnętrznych
 * Kluczowe dla logiki biznesowej i poprawności danych
 */

describe("normalizeTitle", () => {
  describe("normalizacja diakrytyków", () => {
    it("should normalize Polish diacritics to ASCII equivalents", () => {
      // Arrange
      const input = "Ćwiczenie";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("cwiczenie");
    });

    it("should normalize multiple diacritics in single string", () => {
      // Arrange
      const input = "Łąka Ćwiczeń";

      // Act
      const result = normalizeTitle(input);

      // Assert
      // Note: "Ł" is not a diacritic but a separate letter, so it remains as "ł"
      expect(result).toBe("łaka cwiczen");
    });

    it("should normalize all common Polish diacritics", () => {
      // Arrange
      // Note: "Ł" is not a diacritic but a separate letter, so it remains as "ł"
      const testCases = [
        { input: "ą", expected: "a" },
        { input: "ć", expected: "c" },
        { input: "ę", expected: "e" },
        { input: "ł", expected: "ł" }, // Ł is a separate letter, not a diacritic
        { input: "ń", expected: "n" },
        { input: "ó", expected: "o" },
        { input: "ś", expected: "s" },
        { input: "ź", expected: "z" },
        { input: "ż", expected: "z" },
      ];

      // Act & Assert
      testCases.forEach(({ input, expected }) => {
        expect(normalizeTitle(input)).toBe(expected);
      });
    });
  });

  describe("obsługa wielokrotnych spacji", () => {
    it("should replace multiple spaces with single space", () => {
      // Arrange
      const input = "Ćwiczenie   na   nogi";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("cwiczenie na nogi");
    });

    it("should handle tabs and newlines as spaces", () => {
      // Arrange
      const input = "Ćwiczenie\t\tna\n\nnogi";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("cwiczenie na nogi");
    });
  });

  describe("konwersja na małe litery", () => {
    it("should convert uppercase to lowercase", () => {
      // Arrange
      const input = "PRZYSIADY";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("przysiady");
    });

    it("should handle mixed case", () => {
      // Arrange
      const input = "Przysiady Z Obciążeniem";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("przysiady z obciazeniem");
    });
  });

  describe("trimowanie białych znaków", () => {
    it("should trim leading and trailing whitespace", () => {
      // Arrange
      const input = "  przysiady  ";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("przysiady");
    });

    it("should handle string with only whitespace", () => {
      // Arrange
      const input = "   \t\n  ";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("");
    });
  });

  describe("warunki brzegowe", () => {
    it("should handle empty string", () => {
      // Arrange
      const input = "";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("");
    });

    it("should handle string with only diacritics", () => {
      // Arrange
      const input = "ĄĆĘŁŃÓŚŹŻ";

      // Act
      const result = normalizeTitle(input);

      // Assert
      // Note: "Ł" remains as "ł" because it's not a diacritic (separate letter)
      // Order: A→a, C→c, E→e, Ł→ł, N→n, O→o, S→s, Z→z, Z→z
      expect(result).toBe("acełnoszz");
    });

    it("should handle complex real-world example", () => {
      // Arrange
      const input = "  Przysiady   Z   Obciążeniem  (Ćwiczenie Na Nogi)  ";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("przysiady z obciazeniem (cwiczenie na nogi)");
    });

    it("should preserve special characters but normalize diacritics", () => {
      // Arrange
      const input = "Ćwiczenie #1: Warm-up";

      // Act
      const result = normalizeTitle(input);

      // Assert
      expect(result).toBe("cwiczenie #1: warm-up");
    });
  });
});

describe("normalizeTitleForDbLookup", () => {
  it("should match PostgreSQL title_normalized: lower, trim, collapse spaces, keep Polish diacritics", () => {
    expect(normalizeTitleForDbLookup("Rozciąganie core")).toBe(
      "rozciąganie core"
    );
    expect(normalizeTitleForDbLookup("  Łąka  Ćwiczeń  ")).toBe(
      "łąka ćwiczeń"
    );
  });

  it("should not strip diacritics (unlike normalizeTitle)", () => {
    expect(normalizeTitleForDbLookup("Ćwiczenie")).toBe("ćwiczenie");
    expect(normalizeTitleForDbLookup("Przysiady")).toBe("przysiady");
  });
});

describe("validateExerciseBusinessRules", () => {
  describe("reguła: dokładnie jedno z reps lub duration_seconds", () => {
    it("should return error when both reps and duration_seconds are provided", () => {
      // Arrange
      const input = {
        reps: 10,
        duration_seconds: 30,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Podaj dokładnie jedno z pól: reps lub duration_seconds.",
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return error when neither reps nor duration_seconds is provided", () => {
      // Arrange
      const input = {
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Podaj dokładnie jedno z pól: reps lub duration_seconds.",
      );
    });

    it("should return empty array when only reps is provided", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when only duration_seconds is provided", () => {
      // Arrange
      const input = {
        duration_seconds: 30,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle null values correctly", () => {
      // Arrange
      const input = {
        reps: null,
        duration_seconds: null,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Podaj dokładnie jedno z pól: reps lub duration_seconds.",
      );
    });
  });

  describe("reguła: co najmniej jedno pole odpoczynku", () => {
    it("should return error when no rest fields are provided", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds).",
      );
    });

    it("should return empty array when rest_in_between_seconds is provided", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when rest_after_series_seconds is provided", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_after_series_seconds: 120,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when both rest fields are provided", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 60,
        rest_after_series_seconds: 120,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle null values in rest fields", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: null,
        rest_after_series_seconds: null,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds).",
      );
    });
  });

  describe("reguła: series musi być większe od zera", () => {
    it("should return error when series is 0", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 0,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain("Pole series musi być większe od zera.");
    });

    it("should return error when series is negative", () => {
      // Arrange
      const input = {
        reps: 10,
        series: -5,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain("Pole series musi być większe od zera.");
    });

    it("should return empty array when series is positive", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 60,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).not.toContain("Pole series musi być większe od zera.");
    });

    it("should not validate series when series is undefined", () => {
      // Arrange
      const input = {
        reps: 10,
        rest_in_between_seconds: 60,
        // series is undefined
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).not.toContain("Pole series musi być większe od zera.");
    });
  });

  describe("reguła: pola odpoczynku nie mogą być ujemne", () => {
    it("should return error when rest_in_between_seconds is negative", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: -10,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Pole rest_in_between_seconds nie może być ujemne.",
      );
    });

    it("should return error when rest_after_series_seconds is negative", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_after_series_seconds: -20,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Pole rest_after_series_seconds nie może być ujemne.",
      );
    });

    it("should allow zero values for rest fields", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 0,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).not.toContain(
        "Pole rest_in_between_seconds nie może być ujemne.",
      );
    });
  });

  describe("kombinacje błędów", () => {
    it("should return multiple errors when multiple rules are violated", () => {
      // Arrange
      const input = {
        reps: 10,
        duration_seconds: 30, // błąd: oba pola
        series: 0, // błąd: series <= 0
        // brak pól odpoczynku - błąd
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toContain(
        "Podaj dokładnie jedno z pól: reps lub duration_seconds.",
      );
      expect(result).toContain("Pole series musi być większe od zera.");
      expect(result).toContain(
        "Wymagane jest co najmniej jedno pole odpoczynku (rest_in_between_seconds lub rest_after_series_seconds).",
      );
      expect(result.length).toBe(3);
    });

    it("should return all validation errors in correct order", () => {
      // Arrange
      const input = {
        reps: 10,
        duration_seconds: 30,
        series: -1,
        rest_in_between_seconds: -5,
        rest_after_series_seconds: -10,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]).toContain("Podaj dokładnie jedno z pól");
      expect(result).toContain("Pole series musi być większe od zera.");
      expect(result).toContain(
        "Pole rest_in_between_seconds nie może być ujemne.",
      );
      expect(result).toContain(
        "Pole rest_after_series_seconds nie może być ujemne.",
      );
    });
  });

  describe("poprawne dane wejściowe", () => {
    it("should return empty array for valid input with reps", () => {
      // Arrange
      const input = {
        reps: 10,
        series: 3,
        rest_in_between_seconds: 60,
        rest_after_series_seconds: 120,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array for valid input with duration_seconds", () => {
      // Arrange
      const input = {
        duration_seconds: 30,
        series: 5,
        rest_in_between_seconds: 45,
      };

      // Act
      const result = validateExerciseBusinessRules(input);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
