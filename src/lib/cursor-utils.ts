/**
 * Wspólne narzędzia do paginacji kursorem.
 * Używane przez repositories: workout-sessions, workout-plans, personal-records, exercises.
 */

export type CursorPayload = {
  sort: string;
  order: string;
  value: string | number;
  id: string;
};

export type DecodeCursorOptions = {
  sortFields?: readonly string[];
  orderValues?: readonly string[];
};

/**
 * Enkoduje kursor paginacji do base64url string.
 */
export function encodeCursor(cursor: CursorPayload): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Dekoduje kursor paginacji z base64url string.
 * Opcjonalnie waliduje sort/order przeciwko dozwolonym wartościom.
 */
export function decodeCursor(
  cursor: string,
  options?: DecodeCursorOptions,
): CursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as CursorPayload;

    if (options?.sortFields && !options.sortFields.includes(parsed.sort)) {
      throw new Error("Unsupported cursor fields");
    }
    if (options?.orderValues && !options.orderValues.includes(parsed.order)) {
      throw new Error("Unsupported cursor fields");
    }
    if (!parsed.id || parsed.value === undefined || parsed.value === null) {
      throw new Error("Cursor missing fields");
    }

    return parsed;
  } catch (error) {
    throw new Error("INVALID_CURSOR", { cause: error });
  }
}

/** Obiekt zapytania Supabase z metodą .or() – minimalny kontrakt dla keyset pagination. */
type QueryWithOr<T = unknown> = { or: (filter: string) => T };

/**
 * Zastosowuje filtr kursora do zapytania Supabase.
 * Używane przy paginacji offset-based z kursorem (keyset pagination).
 *
 * @param query - Obiekt zapytania Supabase z metodą .or()
 * @param sort - Nazwa pola sortowania
 * @param order - Kierunek sortowania ('asc' | 'desc')
 * @param cursor - Zdekodowany kursor z value i id
 */
export function applyCursorFilter<T>(
  query: QueryWithOr<T>,
  sort: string,
  order: string,
  cursor: CursorPayload,
): T {
  const direction = order === "asc" ? "gt" : "lt";
  const encodedValue = encodeURIComponent(String(cursor.value));
  const encodedId = encodeURIComponent(cursor.id);

  return query.or(
    `${sort}.${direction}.${encodedValue},and(${sort}.eq.${encodedValue},id.${direction}.${encodedId})`,
  );
}
