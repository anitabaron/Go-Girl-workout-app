import type { SessionSummaryDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionStatusBadge } from "./session-status-badge";
import { SessionDurationDisplay } from "./session-duration-display";
import { formatDateTime } from "@/lib/utils/date-format";

type WorkoutSessionMetadataProps = {
  readonly session: SessionSummaryDTO;
};

export function WorkoutSessionMetadata({
  session,
}: WorkoutSessionMetadataProps) {
  if (!session.started_at) {
    return null;
  }

  const formattedStartedAt = formatDateTime(session.started_at);
  const formattedCompletedAt = session.completed_at
    ? formatDateTime(session.completed_at)
    : null;
  const planName = session.plan_name_at_time || "Plan usunięty";

  return (
    <Card
      className="rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950"
      data-test-id="workout-session-details-metadata"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            Informacje o sesji
          </CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
              Plan treningowy
            </p>
            <p
              className="mt-1 text-md font-semibold"
              data-test-id="workout-session-details-plan-name"
            >
              {planName}
            </p>
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
              <p className="mt-1 text-md font-semibold">
                {formattedCompletedAt}
              </p>
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
