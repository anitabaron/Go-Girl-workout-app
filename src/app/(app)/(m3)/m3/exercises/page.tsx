import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  PageHeader,
  Surface,
  EmptyState,
  ExercisesToolbar,
} from "../_components";

// TODO: Replace with real data from listExercisesService when M3 backend is wired.
// For now, placeholder mock data to demonstrate layout.
const MOCK_EXERCISES = [
  { id: "1", title: "Bench Press", type: "strength", part: "Chest" },
  { id: "2", title: "Squat", type: "strength", part: "Legs" },
  { id: "3", title: "Deadlift", type: "strength", part: "Back" },
  { id: "4", title: "Overhead Press", type: "strength", part: "Shoulders" },
  { id: "5", title: "Pull-up", type: "strength", part: "Back" },
];

export default function ExercisesPage() {
  const exercises = MOCK_EXERCISES;
  const isEmpty = exercises.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercises"
        description="Browse and manage your exercise library."
        actions={
          <Button asChild>
            <Link href="/exercises/new">
              <Plus className="mr-2 size-4" />
              Add exercise
            </Link>
          </Button>
        }
      />

      <Surface>
        <ExercisesToolbar />

        <div className="mt-6">
          {isEmpty ? (
            <EmptyState
              title="No exercises yet"
              description="Add your first exercise to get started."
              icon={<Plus className="text-muted-foreground" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {exercises.map((ex) => (
                <Card key={ex.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <h3 className="m3-title line-clamp-1">{ex.title}</h3>
                    <p className="m3-label text-muted-foreground">
                      {ex.type} · {ex.part}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/exercises/${ex.id}`}>View</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
