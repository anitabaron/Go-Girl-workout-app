"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExercisesError({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Wystąpił błąd</CardTitle>
          <CardDescription>
            Nie udało się załadować ćwiczeń. Spróbuj ponownie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} variant="default">
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
