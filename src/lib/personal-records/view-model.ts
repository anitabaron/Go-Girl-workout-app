import type {
  PersonalRecordWithExerciseDTO,
  PRMetricType,
  ExerciseType,
  ExercisePart,
} from "@/types";

/**
 * ViewModel dla pojedynczej metryki rekordu osobistego.
 */
export type PersonalRecordMetricVM = {
  metricType: PRMetricType;
  label: string; // Etykieta metryki (przetłumaczona: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  valueDisplay: string; // Wartość sformatowana do wyświetlenia (np. "15", "02:30", "50 kg")
  achievedAt: string; // Data osiągnięcia (sformatowana w formacie polskim)
  sessionId: string | null; // UUID sesji lub null
  isNew: boolean; // Czy rekord jest nowy (osiągnięty w ostatniej sesji)
};

/**
 * ViewModel dla widoku rekordów osobistych dla konkretnego ćwiczenia.
 */
export type ExercisePersonalRecordsViewModel = {
  exercise: {
    id: string;
    title: string;
    type: string; // Przetłumaczony typ (np. "Rozgrzewka", "Główny trening", "Schłodzenie")
    part: string; // Przetłumaczona partia (np. "Nogi", "Brzuch", "Plecy", "Ręce", "Klatka")
  };
  records: PersonalRecordMetricViewModel[];
};

/**
 * ViewModel dla pojedynczej metryki rekordu w widoku szczegółów ćwiczenia.
 */
export type PersonalRecordMetricViewModel = {
  metricType: PRMetricType;
  label: string; // Etykieta metryki (przetłumaczona: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  valueDisplay: string; // Wartość sformatowana do wyświetlenia (np. "15", "02:30", "50 kg")
  achievedAt: string; // Data osiągnięcia (sformatowana w formacie polskim)
  sessionId: string | null; // UUID sesji lub null
  isNew: boolean; // Czy rekord jest nowy (osiągnięty w ostatniej sesji) - opcjonalnie
};

/**
 * ViewModel dla grupy rekordów per ćwiczenie.
 */
export type PersonalRecordGroupVM = {
  exerciseId: string; // UUID ćwiczenia
  title: string; // Nazwa ćwiczenia
  type: string; // Typ ćwiczenia (przetłumaczony: "Rozgrzewka", "Główny trening", "Schłodzenie")
  part: string; // Partia mięśniowa (przetłumaczona: "Nogi", "Brzuch", "Plecy", "Ręce", "Klatka")
  metrics: PersonalRecordMetricVM[]; // Lista metryk dla ćwiczenia
};

/**
 * ViewModel dla odpowiedzi strony z rekordami osobistymi.
 */
export type PersonalRecordsPageResponse = {
  items: PersonalRecordGroupVM[]; // Lista grup rekordów per ćwiczenie
  nextCursor: string | null; // Kursor paginacji lub null
};

export const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

export const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

const metricTypeLabels: Record<PRMetricType, string> = {
  total_reps: "Maks. powtórzenia",
  max_duration: "Maks. czas",
  max_weight: "Maks. ciężar",
};

/**
 * Formatuje wartość metryki do wyświetlenia.
 */
function formatMetricValue(metricType: PRMetricType, value: number): string {
  switch (metricType) {
    case "total_reps":
      return value.toString();
    case "max_duration": {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    case "max_weight":
      return `${value} kg`;
    default:
      return value.toString();
  }
}

/**
 * Formatuje datę osiągnięcia rekordu w formacie polskim.
 */
function formatAchievedDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Mapuje PersonalRecordWithExerciseDTO[] na PersonalRecordsPageResponse.
 * Grupuje rekordy per ćwiczenie i mapuje je do ViewModel.
 *
 * @param records - Lista rekordów z API
 * @param nextCursor - Kursor paginacji lub null
 * @returns ViewModel z pogrupowanymi rekordami
 */
export function mapPersonalRecordsToViewModel(
  records: PersonalRecordWithExerciseDTO[],
  nextCursor: string | null
): PersonalRecordsPageResponse {
  // Grupowanie rekordów per ćwiczenie
  const groupedByExercise = new Map<string, PersonalRecordWithExerciseDTO[]>();

  for (const record of records) {
    const exerciseId = record.exercise_id;
    const existing = groupedByExercise.get(exerciseId) ?? [];
    existing.push(record);
    groupedByExercise.set(exerciseId, existing);
  }

  // Mapowanie grup do ViewModel
  const items: PersonalRecordGroupVM[] = [];

  for (const [exerciseId, exerciseRecords] of groupedByExercise.entries()) {
    const firstRecord = exerciseRecords[0]!;
    const exercise = firstRecord.exercise;

    // Mapowanie metryk
    const metrics: PersonalRecordMetricVM[] = exerciseRecords.map((record) => ({
      metricType: record.metric_type,
      label: metricTypeLabels[record.metric_type],
      valueDisplay: formatMetricValue(record.metric_type, record.value),
      achievedAt: formatAchievedDate(record.achieved_at),
      sessionId: record.achieved_in_session_id,
      isNew: false, // TODO: Implementacja logiki wykrywania nowych rekordów (osiągniętych w ostatniej sesji)
    }));

    items.push({
      exerciseId,
      title: exercise.title,
      type: typeLabels[exercise.type],
      part: partLabels[exercise.part],
      metrics,
    });
  }

  return {
    items,
    nextCursor,
  };
}

/**
 * Mapuje listę rekordów z API na ViewModel dla widoku szczegółów ćwiczenia.
 * Jeśli lista jest pusta, zwraca `null`. Jeśli lista nie jest pusta, wyodrębnia
 * metadane ćwiczenia z pierwszego rekordu i mapuje wszystkie rekordy do
 * `PersonalRecordMetricViewModel[]`.
 *
 * @param records - Lista rekordów z API
 * @returns ViewModel z informacjami o ćwiczeniu i rekordach lub null, jeśli brak rekordów
 */
export function mapExercisePersonalRecordsToViewModel(
  records: PersonalRecordWithExerciseDTO[]
): ExercisePersonalRecordsViewModel | null {
  // Jeśli lista jest pusta, zwróć null
  if (records.length === 0) {
    return null;
  }

  // Wyodrębnij metadane ćwiczenia z pierwszego rekordu
  const firstRecord = records[0]!;
  const exercise = firstRecord.exercise;

  // Przetłumacz typ i partię ćwiczenia
  const translatedType = typeLabels[exercise.type];
  const translatedPart = partLabels[exercise.part];

  // Mapuj wszystkie rekordy do PersonalRecordMetricViewModel[]
  const mappedRecords: PersonalRecordMetricViewModel[] = records.map(
    (record) => ({
      metricType: record.metric_type,
      label: metricTypeLabels[record.metric_type],
      valueDisplay: formatMetricValue(record.metric_type, record.value),
      achievedAt: formatAchievedDate(record.achieved_at),
      sessionId: record.achieved_in_session_id,
      isNew: false, // TODO: Implementacja logiki wykrywania nowych rekordów (osiągniętych w ostatniej sesji)
    })
  );

  return {
    exercise: {
      id: exercise.id,
      title: exercise.title,
      type: translatedType,
      part: translatedPart,
    },
    records: mappedRecords,
  };
}
