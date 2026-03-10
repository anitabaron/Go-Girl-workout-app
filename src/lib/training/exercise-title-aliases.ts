import {
  normalizeTitle,
  normalizeTitleForDbLookup,
} from "@/lib/validation/exercises";

const GENERIC_EXERCISE_WORDS = new Set([
  "hold",
  "holds",
  "drill",
  "drills",
  "stretch",
  "stretches",
  "mobility",
  "flow",
  "negative",
  "negatives",
  "activation",
  "warm",
  "warmup",
  "cool",
  "cooldown",
  "assisted",
  "entry",
]);

const PHRASE_VARIANTS: Array<[RegExp, string]> = [
  [/\bl[\s-]*sit\b/g, "l sit"],
  [/\bhand\s*stand\b/g, "handstand"],
  [/\bpull[\s-]*up\b/g, "pull up"],
  [/\bchin[\s-]*up\b/g, "chin up"],
  [/\bpush[\s-]*up\b/g, "push up"],
  [/\bscap(?:ular)?\b/g, "scapula"],
  [/\b90[\s/-]*90\b/g, "90 90"],
  [/\bhip[\s-]*flexor\b/g, "hip flexor"],
];

const TOKEN_VARIANTS: Record<string, string> = {
  slides: "slide",
  raises: "raise",
};

function normalizeAliasBase(value: string): string {
  let next = value.toLowerCase().trim();
  for (const [pattern, replacement] of PHRASE_VARIANTS) {
    next = next.replace(pattern, replacement);
  }
  next = next.replace(/[+/,_-]+/g, " ");
  next = next.replace(/\s+/g, " ").trim();
  return next;
}

function buildBaseVariants(title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [];

  return Array.from(
    new Set([
      trimmed,
      trimmed.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
      trimmed.replace(/["'`]/g, "").trim(),
      trimmed.replace(/[+/,_-]+/g, " ").replace(/\s+/g, " ").trim(),
      normalizeAliasBase(trimmed),
    ].filter(Boolean)),
  );
}

export function buildExerciseTitleAliases(title: string): string[] {
  const aliases = new Set<string>();

  for (const variant of buildBaseVariants(title)) {
    const base = normalizeAliasBase(variant);
    const normalizedDb = normalizeTitleForDbLookup(base);
    const normalizedTitle = normalizeTitle(base);

    if (normalizedDb) aliases.add(normalizedDb);
    if (normalizedTitle) aliases.add(normalizedTitle);

    const tokens = normalizedDb.split(" ").filter(Boolean);
    const strippedTokens = tokens.filter((token) => !GENERIC_EXERCISE_WORDS.has(token));
    const stripped = strippedTokens.join(" ");
    if (strippedTokens.length >= 2 && stripped !== normalizedDb) {
      aliases.add(stripped);
    }
  }

  return Array.from(aliases);
}

export function buildExerciseTitleSignature(title: string): string {
  const tokens = normalizeTitleForDbLookup(normalizeAliasBase(title))
    .split(" ")
    .filter(Boolean)
    .filter((token) => !GENERIC_EXERCISE_WORDS.has(token));

  return tokens.map((token) => TOKEN_VARIANTS[token] ?? token).join(" ");
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = left.split(" ").filter(Boolean);
  const rightTokens = right.split(" ").filter(Boolean);
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const rightSet = new Set(rightTokens);
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightSet.has(token)) overlap += 1;
  }

  return overlap / Math.max(leftTokens.length, rightTokens.length);
}

export function resolveExerciseLibraryMatch<T extends { id: string; title: string }>(
  title: string,
  libraryExercises: T[],
): T | null {
  const aliases = buildExerciseTitleAliases(title);
  const signature = buildExerciseTitleSignature(title);
  const signatureTokenCount = signature.split(" ").filter(Boolean).length;

  const libraryByAlias = new Map<string, T>();
  const libraryBySignature = new Map<string, T[]>();

  for (const exercise of libraryExercises) {
    for (const alias of buildExerciseTitleAliases(exercise.title)) {
      if (!libraryByAlias.has(alias)) {
        libraryByAlias.set(alias, exercise);
      }
    }

    const exerciseSignature = buildExerciseTitleSignature(exercise.title);
    if (exerciseSignature) {
      const current = libraryBySignature.get(exerciseSignature) ?? [];
      current.push(exercise);
      libraryBySignature.set(exerciseSignature, current);
    }
  }

  for (const alias of aliases) {
    const exact = libraryByAlias.get(alias);
    if (exact) return exact;
  }

  if (signature && signatureTokenCount >= 2) {
    const exactSignatureMatches = libraryBySignature.get(signature) ?? [];
    if (exactSignatureMatches.length === 1) {
      return exactSignatureMatches[0] ?? null;
    }
  }

  if (signatureTokenCount < 2) {
    return null;
  }

  let bestMatch: T | null = null;
  let bestScore = 0;
  let secondBestScore = 0;

  for (const exercise of libraryExercises) {
    const exerciseSignature = buildExerciseTitleSignature(exercise.title);
    const score = tokenOverlapScore(signature, exerciseSignature);
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestMatch = exercise;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (!bestMatch) return null;
  if (bestScore < 0.75) return null;
  if (bestScore === secondBestScore) return null;

  return bestMatch;
}
