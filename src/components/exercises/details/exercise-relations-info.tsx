import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExerciseRelationsInfoProps = {
  readonly exerciseId: string;
  readonly userId: string;
  readonly relationsData: {
    plansCount: number;
    sessionsCount: number;
    hasRelations: boolean;
  };
};

export function ExerciseRelationsInfo({
  relationsData,
}: ExerciseRelationsInfoProps) {
  const { plansCount, sessionsCount, hasRelations } = relationsData;

  if (!hasRelations) {
    return null;
  }

  return (
    <Card role="region" aria-labelledby="exercise-relations-title">
      <CardHeader>
        <CardTitle className="text-lg" id="exercise-relations-title">
          Powiązania
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {plansCount > 0 && (
          <div>
            <p className="text-sm text-muted-foreground" aria-label={`Używane w ${plansCount} ${plansCount === 1 ? "planie treningowym" : "planach treningowych"}`}>
              Używane w {plansCount}{" "}
              {plansCount === 1 ? "planie treningowym" : "planach treningowych"}
            </p>
          </div>
        )}
        {sessionsCount > 0 && (
          <div>
            <p className="text-sm text-muted-foreground" aria-label={`Używane w ${sessionsCount} ${sessionsCount === 1 ? "sesji treningowej" : "sesjach treningowych"}`}>
              Używane w {sessionsCount}{" "}
              {sessionsCount === 1 ? "sesji treningowej" : "sesjach treningowych"}
            </p>
          </div>
        )}
        {hasRelations && (
          <p className="text-sm text-destructive mt-2" role="alert">
            Ćwiczenie nie może być usunięte, ponieważ jest używane w historii
            treningów.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
