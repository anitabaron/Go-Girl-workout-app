import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { listTrainingProgramsService } from "@/services/training-programs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ProgramsPage() {
  const userId = await requireAuth();
  const { items } = await listTrainingProgramsService(userId, { limit: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programy treningowe"
        description="Program = cykl 1-3 miesięcy z harmonogramem sesji."
      />

      <Surface variant="high" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Wygeneruj draft programu przez `POST /api/ai/programs/generate`, a następnie zapisz
            go przez `POST /api/ai/programs`.
          </p>
          <Button asChild variant="outline">
            <Link href="/statistics">Otwórz kalendarz</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Brak programów. Utwórz pierwszy program z poziomu Trenera AI.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((program) => (
              <div key={program.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{program.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {program.goal_text ?? "Brak opisu celu"}
                    </p>
                  </div>
                  <Badge variant="secondary">{program.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{program.duration_months} mies.</span>
                  <span>•</span>
                  <span>{program.sessions_per_week} treningi/tydz.</span>
                  <span>•</span>
                  <span>{program.sessions.length} sesji</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
