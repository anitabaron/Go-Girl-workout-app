import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "./_components";

export default function M3Page() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Go Girl"
        description="Material 3 foundation. Neutral surfaces, calm typography, and consistent spacing."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Surface>
          <h2 className="m3-title">Exercises</h2>
          <p className="m3-body mt-2 text-muted-foreground">
            Browse and manage your exercise library.
          </p>
          <Button asChild className="mt-4">
            <Link href="/m3/exercises">Go to Exercises</Link>
          </Button>
        </Surface>

        <Surface>
          <h2 className="m3-title">Welcome</h2>
          <p className="m3-body mt-2 text-muted-foreground">
            This is the M3 UI foundation. Neutral surfaces, calm typography, and
            consistent spacing.
          </p>
        </Surface>
      </div>
    </div>
  );
}
