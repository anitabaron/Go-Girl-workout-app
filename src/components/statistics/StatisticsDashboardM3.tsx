"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  RefreshCcw,
  Send,
  TrendingUp,
  Watch,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StatisticsSession = {
  id: string;
  workout_plan_id: string | null;
  plan_name_at_time: string | null;
  started_at: string;
  completed_at: string | null;
  active_duration_seconds?: number | null;
  exercise_count?: number;
  exercise_names?: string[];
};

type StatisticsDashboardM3Props = {
  title: string;
  description: string;
  sessions: StatisticsSession[];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function startOfWeekMonday(date: Date): Date {
  const d = atStartOfDay(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -offset);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getSessionDurationSeconds(session: StatisticsSession): number {
  if (
    typeof session.active_duration_seconds === "number" &&
    session.active_duration_seconds > 0
  ) {
    return session.active_duration_seconds;
  }

  if (session.completed_at) {
    const diff =
      new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
    return diff > 0 ? Math.floor(diff / 1000) : 0;
  }

  return 0;
}

function formatMonthLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMinutes(minutes: number, t: (key: string) => string): string {
  if (minutes <= 0) return `0 ${t("minutesShort")}`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours === 0) return `${restMinutes} ${t("minutesShort")}`;
  if (restMinutes === 0) return `${hours} ${t("hoursShort")}`;

  return `${hours} ${t("hoursShort")} ${restMinutes} ${t("minutesShort")}`;
}

function compactWorkoutLabel(name: string): string {
  return name.trim();
}

export function StatisticsDashboardM3({
  title,
  description,
  sessions,
}: Readonly<StatisticsDashboardM3Props>) {
  const t = useTranslations("statisticsPage");
  const router = useRouter();
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<StatisticsSession | null>(
    null,
  );

  const normalizedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      ),
    [sessions],
  );

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StatisticsSession[]>();

    for (const session of normalizedSessions) {
      const key = toDateKey(new Date(session.started_at));
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }

    return map;
  }, [normalizedSessions]);

  const now = new Date();
  const todayKey = toDateKey(now);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (sessionsByDate.has(todayKey)) return todayKey;

    const firstAvailable = Array.from(sessionsByDate.keys()).sort((a, b) =>
      b.localeCompare(a),
    )[0];
    return firstAvailable ?? todayKey;
  });

  useEffect(() => {
    if (sessionsByDate.has(selectedDateKey)) return;
    if (sessionsByDate.has(todayKey)) {
      setSelectedDateKey(todayKey);
      return;
    }

    const firstAvailable = Array.from(sessionsByDate.keys()).sort((a, b) =>
      b.localeCompare(a),
    )[0];
    if (firstAvailable) setSelectedDateKey(firstAvailable);
  }, [selectedDateKey, sessionsByDate, todayKey]);

  const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const locale = "pl-PL";

  const dayLabels = [
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
    t("weekdaySun"),
  ];

  const currentWeekStart = startOfWeekMonday(now);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const previousWeekStart = addDays(currentWeekStart, -7);

  const sessionsThisWeek = normalizedSessions.filter((session) => {
    const startedAt = new Date(session.started_at);
    return startedAt >= currentWeekStart && startedAt < nextWeekStart;
  });

  const sessionsPreviousWeek = normalizedSessions.filter((session) => {
    const startedAt = new Date(session.started_at);
    return startedAt >= previousWeekStart && startedAt < currentWeekStart;
  });

  const weekDayCounts = sessionsThisWeek.reduce<number[]>(
    (acc, session) => {
      const day = new Date(session.started_at).getDay();
      const mondayIndex = day === 0 ? 6 : day - 1;
      acc[mondayIndex] += 1;
      return acc;
    },
    [0, 0, 0, 0, 0, 0, 0],
  );

  const maxWeekDayCount = Math.max(1, ...weekDayCounts);

  const weeklyTotalDurationMinutes = Math.round(
    sessionsThisWeek.reduce((sum, session) => sum + getSessionDurationSeconds(session), 0) /
      60,
  );

  const weeklyAverageDurationMinutes =
    sessionsThisWeek.length > 0
      ? Math.round(weeklyTotalDurationMinutes / sessionsThisWeek.length)
      : 0;

  const sessionsLast30Days = normalizedSessions.filter((session) => {
    const startedAt = new Date(session.started_at);
    return startedAt >= addDays(atStartOfDay(now), -30);
  });

  const favoritePlan = (() => {
    if (sessionsLast30Days.length === 0) return null;

    const counts = new Map<string, number>();
    for (const session of sessionsLast30Days) {
      const planName = session.plan_name_at_time ?? t("deletedPlan");
      counts.set(planName, (counts.get(planName) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  })();

  const streakDays = (() => {
    const daySet = new Set(Array.from(sessionsByDate.keys()));
    let streak = 0;
    let cursor = atStartOfDay(now);

    while (daySet.has(toDateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    return streak;
  })();

  const weeklyTrend = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => {
      const start = addDays(currentWeekStart, (idx - 7) * 7);
      const end = addDays(start, 7);
      const count = normalizedSessions.filter((session) => {
        const startedAt = new Date(session.started_at);
        return startedAt >= start && startedAt < end;
      }).length;

      return {
        label: `${start.getDate()}.${start.getMonth() + 1}`,
        count,
      };
    });
  }, [currentWeekStart, normalizedSessions]);

  const weeklyTrendMax = Math.max(1, ...weeklyTrend.map((item) => item.count));

  const handleRepeatPlan = async (planId: string | null) => {
    if (!planId) {
      toast.error(t("repeatPlanMissing"));
      return;
    }

    setStartingPlanId(planId);

    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_plan_id: planId }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(errorData.message ?? t("repeatPlanFailed"));
        return;
      }

      const data = (await response.json()) as { id?: string };
      if (!data.id) {
        toast.error(t("repeatPlanFailed"));
        return;
      }

      toast.success(t("repeatPlanSuccess"));
      router.push(`/workout-sessions/${data.id}/active`);
    } catch (error) {
      console.error("Error repeating plan", error);
      toast.error(t("repeatPlanFailed"));
    } finally {
      setStartingPlanId(null);
    }
  };

  const selectedSessionDurationMinutes = selectedSession
    ? Math.round(getSessionDurationSeconds(selectedSession) / 60)
    : 0;

  return (
    <div className="space-y-8 pb-[calc(var(--m3-mobile-nav-height)+0.25rem)] md:pb-8">
      <PageHeader title={title} description={description} />

      <Surface variant="high" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-muted-foreground" />
            <h2 className="m3-title-large">{t("calendarTitle")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              aria-label={t("previousMonth")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-44 text-center text-sm font-semibold capitalize">
              {formatMonthLabel(monthCursor, locale)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setMonthCursor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              aria-label={t("nextMonth")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dayLabels.map((label) => (
            <div key={label} className="py-1 text-[10px] xs:text-xs">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {monthGrid.map((day) => {
            const dayKey = toDateKey(day);
            const daySessions = sessionsByDate.get(dayKey) ?? [];
            const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
            const isSelected = selectedDateKey === dayKey;
            const isToday = dayKey === todayKey;

            return (
              <div
                key={dayKey}
                className={[
                  "flex w-full aspect-[0.94] min-h-0 flex-col rounded-lg border p-0.5 transition-colors xs:aspect-[0.96] xs:p-1 sm:aspect-square sm:rounded-xl sm:p-1.5 xl:aspect-auto xl:min-h-32 xl:p-2",
                  isCurrentMonth ? "bg-card" : "bg-muted/30",
                  isSelected ? "border-primary ring-1 ring-primary/40" : "border-border",
                ].join(" ")}
                onClick={() => setSelectedDateKey(dayKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDateKey(dayKey);
                  }
                }}
              >
                <div className="mb-0 flex items-center justify-between sm:mb-0">
                  <span
                    className={[
                      "inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold xs:size-5 xs:text-xs sm:size-7 sm:text-xs",
                      isToday ? "bg-primary text-primary-foreground" : "",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="space-y-0.5 overflow-hidden">
                  {daySessions.length > 0 && (
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center rounded-md bg-primary/10 px-0.5 py-0 text-left text-[10px] font-medium leading-tight text-primary sm:hidden"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDateKey(dayKey);
                        setSelectedSession(daySessions[0]);
                      }}
                      title={t("openDayDetails")}
                    >
                      <span className="block w-full overflow-hidden break-words text-[9px] leading-[1.05] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {compactWorkoutLabel(
                          daySessions[0].plan_name_at_time ?? t("deletedPlan"),
                        )}
                      </span>
                    </button>
                  )}
                  {daySessions[0] && (
                    <button
                      key={`${daySessions[0].id}-desktop`}
                      type="button"
                      className="hidden w-full cursor-pointer rounded-md bg-primary/10 px-2 py-1 text-left text-[11px] font-medium text-primary hover:bg-primary/20 sm:block"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDateKey(dayKey);
                        setSelectedSession(daySessions[0]);
                      }}
                      title={daySessions[0].plan_name_at_time ?? t("deletedPlan")}
                    >
                      {daySessions[0].plan_name_at_time ?? t("deletedPlan")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </Surface>

      <Surface variant="high" className="space-y-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-muted-foreground" />
          <h2 className="m3-title-large">{t("weeklyStatsTitle")}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("metricWorkoutsWeek")}
            </p>
            <p className="mt-2 text-2xl font-semibold">{sessionsThisWeek.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("metricVsPrevious")} {sessionsPreviousWeek.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("metricTotalDurationWeek")}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMinutes(weeklyTotalDurationMinutes, t)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("metricAverageSession")}{" "}
              {formatMinutes(weeklyAverageDurationMinutes, t)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("metricFavoritePlan")}
            </p>
            <p className="mt-2 line-clamp-2 text-base font-semibold">
              {favoritePlan?.[0] ?? t("noData")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {favoritePlan ? `${favoritePlan[1]} ${t("workoutsLabel")}` : ""}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("metricStreakDays")}
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold">
              <Flame className="size-5 text-orange-500" />
              {streakDays}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("daysLabel")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-4 text-sm font-semibold">{t("chartWeekdays")}</p>
            <div className="grid grid-cols-7 items-end gap-2">
              {weekDayCounts.map((count, index) => {
                const height = Math.max(6, (count / maxWeekDayCount) * 96);
                return (
                  <div key={`${dayLabels[index]}-${count}`} className="space-y-2">
                    <div className="h-28 rounded-lg bg-muted/50 p-1">
                      <div
                        className="w-full rounded-md bg-primary transition-all"
                        style={{ height: `${height}px`, marginTop: `${108 - height}px` }}
                      />
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground">
                      {dayLabels[index]}
                    </p>
                    <p className="text-center text-xs font-semibold">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-muted-foreground" />
              {t("chartWeeklyTrend")}
            </p>
            <div className="grid grid-cols-8 items-end gap-2">
              {weeklyTrend.map((item) => {
                const height = Math.max(6, (item.count / weeklyTrendMax) * 110);
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="h-28 rounded-lg bg-muted/50 p-1">
                      <div
                        className="w-full rounded-md bg-emerald-500/80"
                        style={{ height: `${height}px`, marginTop: `${108 - height}px` }}
                      />
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-center text-xs font-semibold">{item.count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Surface>

      <Surface variant="high" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Watch className="size-5 text-muted-foreground" />
            <h2 className="m3-title-large">{t("garminTitle")}</h2>
          </div>
          <Badge variant="secondary">{t("comingSoon")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("garminDescription")}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled>
            <Send className="size-4" />
            {t("garminSend")}
          </Button>
          <Button type="button" variant="outline" disabled>
            <RefreshCcw className="size-4" />
            {t("garminRefresh")}
          </Button>
        </div>
      </Surface>

      <Surface variant="high" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-muted-foreground" />
            <h2 className="m3-title-large">{t("aiTitle")}</h2>
          </div>
          <Badge variant="secondary">{t("comingSoon")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("aiDescription")}</p>
      </Surface>

      <Dialog
        open={Boolean(selectedSession)}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
      >
        {selectedSession && (
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedSession.plan_name_at_time ?? t("deletedPlan")}</DialogTitle>
              <DialogDescription>{t("sessionDetailsModalSubtitle")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("sessionDateLabel")}</span>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat(locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(selectedSession.started_at))}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("sessionDurationLabel")}</span>
                  <span className="font-medium">
                    {formatMinutes(selectedSessionDurationMinutes, t)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("sessionExercisesLabel")}</span>
                  <span className="font-medium">{selectedSession.exercise_count ?? 0}</span>
                </div>
              </div>

              {selectedSession.exercise_names && selectedSession.exercise_names.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-sm font-medium">{t("sessionExerciseNamesLabel")}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.exercise_names.join(", ")}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" onClick={() => setSelectedSession(null)}>
                  <Link href={`/workout-sessions/${selectedSession.id}`}>
                    {t("openDetails")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleRepeatPlan(selectedSession.workout_plan_id)}
                  disabled={
                    !selectedSession.workout_plan_id ||
                    startingPlanId === selectedSession.workout_plan_id
                  }
                >
                  {startingPlanId === selectedSession.workout_plan_id
                    ? t("startingPlan")
                    : t("repeatPlan")}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
