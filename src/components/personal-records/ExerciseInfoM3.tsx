import { Badge } from "@/components/ui/badge";

type ExerciseInfoM3Props = {
  exercise: {
    id: string;
    title: string;
    type: string;
    part: string;
  };
};

export function ExerciseInfoM3({ exercise }: ExerciseInfoM3Props) {
  return (
    <div className="space-y-4">
      <h2 className="m3-hero-sm">{exercise.title}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="m3-chip">
          {exercise.type}
        </Badge>
        <Badge variant="outline" className="m3-chip">
          {exercise.part}
        </Badge>
      </div>
    </div>
  );
}
