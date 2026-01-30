import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ExerciseDTO } from "@/types";

type M3ExerciseCardProps = {
  exercise: ExerciseDTO;
};

export function M3ExerciseCard({ exercise }: M3ExerciseCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <h3 className="m3-headline line-clamp-1">{exercise.title}</h3>
        <p className="m3-label text-muted-foreground">
          {exercise.type} · {exercise.part}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/m3/exercises/${exercise.id}`}>View</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
