import type { SessionSummaryDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionStatusBadge } from "./session-status-badge";
import { SessionDurationDisplay } from "./session-duration-display";

type WorkoutSessionMetadataProps = {
  readonly session: SessionSummaryDTO;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function WorkoutSessionMetadata({
  session,
}: WorkoutSessionMetadataProps) {
  if (!session.started_at) {
    return null;
  }

  const formattedStartedAt = formatDate(session.started_at);
  const formattedCompletedAt = session.completed_at
    ? formatDate(session.completed_at)
    : null;
  const planName = session.plan_name_at_time || "Plan usunięty";

  return (
    <Card className="rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Informacje o sesji</CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
              Plan treningowy
            </p>
            <p className="mt-1 text-md font-semibold">{planName}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
              Data rozpoczęcia
            </p>
            <p className="mt-1 text-md font-semibold">{formattedStartedAt}</p>
          </div>

          {formattedCompletedAt && (
            <div>
              <p className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
                Data zakończenia
              </p>
              <p className="mt-1 text-md font-semibold">{formattedCompletedAt}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
              Czas trwania treningu
            </p>
            <p className="mt-1 text-md font-semibold">
              <SessionDurationDisplay
                startedAt={session.started_at}
                completedAt={session.completed_at}
                status={session.status}
              />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
