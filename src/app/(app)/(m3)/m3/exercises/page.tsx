import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exerciseQuerySchema } from "@/lib/validation/exercises";
import { requireAuth } from "@/lib/auth";
import { listExercisesService } from "@/services/exercises";
import type { ExerciseQueryParams } from "@/types";
import {
  PageHeader,
  Surface,
  EmptyState,
  ExercisesToolbar,
} from "../_components";
import { M3ExerciseCard } from "../_ui";

export default async function ExercisesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;

  const parseResult = exerciseQuerySchema.safeParse({
    ...params,
    limit: params.limit ? Number(params.limit) : undefined,
  });

  const parsedQuery: ExerciseQueryParams = parseResult.success
    ? parseResult.data
    : exerciseQuerySchema.parse({});

  const userId = await requireAuth();
  const result = await listExercisesService(userId, parsedQuery);
  const exercises = result.items;
  const isEmpty = exercises.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exercises"
        description="Browse and manage your exercise library."
        actions={
          <div className="flex items-center gap-3">
            <span className="m3-chip">{exercises.length} exercises</span>
            <Button asChild className="m3-cta">
              <Link href="/m3/exercises/new">
                <Plus className="mr-2 size-4" />
                Add exercise
              </Link>
            </Button>
          </div>
        }
      />

      <Surface variant="high">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-lg bg-muted" />}>
          <ExercisesToolbar
            search={parsedQuery.search}
            sort={parsedQuery.sort}
            order={parsedQuery.order}
          />
        </Suspense>

        <div className="mt-8">
          {isEmpty ? (
            <EmptyState
              title="No exercises yet"
              description="Add your first exercise to get started."
              icon={<Plus className="text-muted-foreground" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exercises.map((ex) => (
                <M3ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
