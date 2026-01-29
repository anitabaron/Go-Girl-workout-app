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
