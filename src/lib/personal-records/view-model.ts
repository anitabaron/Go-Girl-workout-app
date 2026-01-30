import type { PersonalRecordWithExerciseDTO, PRMetricType } from "@/types";
import { EXERCISE_PART_LABELS, EXERCISE_TYPE_LABELS } from "@/lib/constants";

/**
 * Wartości per seria w formacie { S1: 10, S2: 10, S3: 10 }
 */
export type SeriesValues = Record<string, number>;

/**
 * ViewModel dla pojedynczej metryki rekordu osobistego.
 */
export type PersonalRecordMetricVM = {
  metricType: PRMetricType;
  label: string; // Etykieta metryki (przetłumaczona: "Maks. powtórzenia", "Maks. czas", "Maks. ciężar")
  valueDisplay: string; // Wartość sformatowana do wyświetlenia (np. "15", "02:30", "50 kg")
  seriesValues: SeriesValues | null; // Wartości per seria (S1, S2, S3...) lub null
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
    type: string; // Typ ćwiczenia w języku angielskim (np. "Warm-up", "Main Workout", "Cool-down")
    part: string; // Partia mięśniowa w języku angielskim (np. "Legs", "Core", "Back", "Arms", "Chest")
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
  seriesValues: SeriesValues | null; // Wartości per seria (S1, S2, S3...) lub null
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
  type: string; // Typ ćwiczenia w języku angielskim (np. "Warm-up", "Main Workout", "Cool-down")
  part: string; // Partia mięśniowa w języku angielskim (np. "Legs", "Core", "Back", "Arms", "Chest")
  metrics: PersonalRecordMetricVM[]; // Lista metryk dla ćwiczenia
};

/**
 * ViewModel dla odpowiedzi strony z rekordami osobistymi.
 */
export type PersonalRecordsPageResponse = {
  items: PersonalRecordGroupVM[]; // Lista grup rekordów per ćwiczenie
  nextCursor: string | null; // Kursor paginacji lub null
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
 * Formatuje datę osiągnięcia rekordu w formacie DD.MM.YYYY.
 */
function formatAchievedDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  nextCursor: string | null,
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
      seriesValues: record.series_values ?? null,
      achievedAt: formatAchievedDate(record.achieved_at),
      sessionId: record.achieved_in_session_id,
      isNew: false, // TODO: Implementacja logiki wykrywania nowych rekordów (osiągniętych w ostatniej sesji)
    }));

    items.push({
      exerciseId,
      title: exercise.title,
      type: EXERCISE_TYPE_LABELS[exercise.type],
      part: EXERCISE_PART_LABELS[exercise.part],
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
  records: PersonalRecordWithExerciseDTO[],
): ExercisePersonalRecordsViewModel | null {
  // Jeśli lista jest pusta, zwróć null
  if (records.length === 0) {
    return null;
  }

  // Wyodrębnij metadane ćwiczenia z pierwszego rekordu
  const firstRecord = records[0]!;
  const exercise = firstRecord.exercise;

  // Przetłumacz typ i partię ćwiczenia
  const translatedType = EXERCISE_TYPE_LABELS[exercise.type];
  const translatedPart = EXERCISE_PART_LABELS[exercise.part];

  // Mapuj wszystkie rekordy do PersonalRecordMetricViewModel[]
  const mappedRecords: PersonalRecordMetricViewModel[] = records.map(
    (record) => ({
      metricType: record.metric_type,
      label: metricTypeLabels[record.metric_type],
      valueDisplay: formatMetricValue(record.metric_type, record.value),
      seriesValues: record.series_values ?? null,
      achievedAt: formatAchievedDate(record.achieved_at),
      sessionId: record.achieved_in_session_id,
      isNew: false, // TODO: Implementacja logiki wykrywania nowych rekordów (osiągniętych w ostatniej sesji)
    }),
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
