import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { listTrainingProgramsService } from "@/services/training-programs";
import { ProgramsListClient } from "@/components/programs/ProgramsListClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { Button } from "@/components/ui/button";

export default async function ProgramsPage() {
  const userId = await requireAuth();
  const { items } = await listTrainingProgramsService(userId, { limit: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programy treningowe"
        description="Program = cykl z harmonogramem poszczególnych sesji treningowych."
      />

      <Surface variant="high" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Utwórz program z poziomu Trenera AI i śledź zaplanowane sesje w kalendarzu.
          </p>
          <Button asChild variant="outline">
            <Link href="/calendar">Otwórz kalendarz</Link>
          </Button>
        </div>

        <ProgramsListClient items={items} />
      </Surface>
    </div>
  );
}
