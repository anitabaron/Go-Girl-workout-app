const EXERCISE_TYPE_LABELS: Record<string, string[]> = {
  "Warm-up": ["Warm-up", "Rozgrzewka"],
  "Main Workout": ["Main Workout", "Trening główny"],
  "Cool-down": ["Cool-down", "Schłodzenie"],
};

const EXERCISE_PART_LABELS: Record<string, string[]> = {
  Legs: ["Legs", "Nogi"],
  Core: ["Core"],
  Back: ["Back", "Plecy"],
  Arms: ["Arms", "Ramiona"],
  Chest: ["Chest", "Klatka piersiowa"],
  Glutes: ["Glutes", "Pośladki"],
  none: ["None", "Brak"],
  "": ["None", "Brak"],
};

const AUTH_LABELS: Record<string, string[]> = {
  loginSubmit: ["Zaloguj się", "Sign in"],
  loginSubmitting: ["Logowanie...", "Signing in..."],
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toI18nRegex(candidates: string[]): RegExp {
  return new RegExp(`^(${candidates.map(escapeRegex).join("|")})$`, "i");
}

function getCandidates(
  map: Record<string, string[]>,
  value: string,
): string[] {
  return map[value] ?? [value];
}

export function getExerciseTypeLabelMatcher(value: string): RegExp {
  return toI18nRegex(getCandidates(EXERCISE_TYPE_LABELS, value));
}

export function getExercisePartLabelMatcher(value: string): RegExp {
  return toI18nRegex(getCandidates(EXERCISE_PART_LABELS, value));
}

export function getAuthLabelMatcher(
  value: keyof typeof AUTH_LABELS | string,
): RegExp {
  return toI18nRegex(getCandidates(AUTH_LABELS, value));
}
