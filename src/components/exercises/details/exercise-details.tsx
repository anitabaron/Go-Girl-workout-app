import type { ExerciseDTO, ExercisePart, ExerciseType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ExerciseDetailsProps = {
  readonly exercise: ExerciseDTO;
};

const partLabels: Record<ExercisePart, string> = {
  Legs: "Nogi",
  Core: "Brzuch",
  Back: "Plecy",
  Arms: "Ręce",
  Chest: "Klatka",
};

const typeLabels: Record<ExerciseType, string> = {
  "Warm-up": "Rozgrzewka",
  "Main Workout": "Główny trening",
  "Cool-down": "Schłodzenie",
};

export function ExerciseDetails({ exercise }: ExerciseDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Podstawowe informacje */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Podstawowe informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2" id="exercise-title">
              {exercise.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-secondary text-destructive hover:bg-primary"
            >
              {typeLabels[exercise.type]}
            </Badge>
            <Badge
              variant="outline"
              className="border-destructive text-destructive"
            >
              {partLabels[exercise.part]}
            </Badge>
            {exercise.level && (
              <Badge
                variant="outline"
                className="border-destructive text-destructive"
              >
                {exercise.level}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metryki */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metryki</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {exercise.reps !== null && exercise.reps !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Powtórzenia</p>
                <p className="text-lg font-semibold" aria-label={`${exercise.reps} powtórzeń`}>
                  {exercise.reps}
                </p>
              </div>
            )}
            {exercise.duration_seconds !== null &&
              exercise.duration_seconds !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Czas (sekundy)
                  </p>
                  <p className="text-lg font-semibold" aria-label={`${exercise.duration_seconds} sekund`}>
                    {exercise.duration_seconds}
                  </p>
                </div>
              )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Serie</p>
              <p className="text-lg font-semibold" aria-label={`${exercise.series} serii`}>
                {exercise.series}
              </p>
            </div>
            {exercise.rest_in_between_seconds !== null &&
              exercise.rest_in_between_seconds !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Odpoczynek między seriami (sekundy)
                  </p>
                  <p className="text-lg font-semibold" aria-label={`${exercise.rest_in_between_seconds} sekund odpoczynku między seriami`}>
                    {exercise.rest_in_between_seconds}
                  </p>
                </div>
              )}
            {exercise.rest_after_series_seconds !== null &&
              exercise.rest_after_series_seconds !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Odpoczynek po seriach (sekundy)
                  </p>
                  <p className="text-lg font-semibold" aria-label={`${exercise.rest_after_series_seconds} sekund odpoczynku po seriach`}>
                    {exercise.rest_after_series_seconds}
                  </p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Dodatkowe informacje */}
      {(exercise.level || exercise.details) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dodatkowe informacje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise.level && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Poziom</p>
                <p className="text-base font-medium">{exercise.level}</p>
              </div>
            )}
            {exercise.details && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Szczegóły</p>
                <p className="text-base whitespace-pre-wrap">
                  {exercise.details}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
