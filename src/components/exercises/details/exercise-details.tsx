import type { ExerciseDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EXERCISE_PART_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/lib/constants";

type ExerciseDetailsProps = {
  readonly exercise: ExerciseDTO;
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
              {EXERCISE_TYPE_LABELS[exercise.type]}
            </Badge>
            <Badge
              variant="outline"
              className="border-destructive text-destructive"
            >
              {EXERCISE_PART_LABELS[exercise.part]}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
            {exercise.estimated_set_time_seconds !== null &&
              exercise.estimated_set_time_seconds !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Szacunkowy czas zestawu (sekundy)
                  </p>
                  <p className="text-lg font-semibold" aria-label={`${exercise.estimated_set_time_seconds} sekund szacunkowego czasu zestawu`}>
                    {exercise.estimated_set_time_seconds}
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
