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
  Plus,
  RefreshCcw,
  Send,
  TrendingUp,
  Watch,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ExternalWorkoutSource,
  ExternalWorkoutSportType,
} from "@/types";
import { useTranslations } from "@/i18n/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardActionButtons } from "@/components/ui/card-action-buttons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StatisticsSession = {
  id: string;
  entry_type: "session" | "external";
  external_workout_id?: string;
  workout_plan_id: string | null;
  plan_name_at_time: string | null;
  started_at: string;
  completed_at: string | null;
  active_duration_seconds?: number | null;
  exercise_count?: number;
  exercise_names?: string[];
  external_sport_type?: ExternalWorkoutSportType;
  external_source?: ExternalWorkoutSource;
  external_calories?: number | null;
  external_hr_avg?: number | null;
  external_hr_max?: number | null;
  external_intensity_rpe?: number | null;
  external_notes?: string | null;
};

type StatisticsDashboardM3Props = {
  title: string;
  description: string;
  sessions: StatisticsSession[];
  availableExternalSportTypes: string[];
};

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
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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

function formatShortDate(date: Date): string {
  const day = date.getDate();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
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

function humanizeSportType(value: string): string {
  const normalized = value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getExternalWorkoutSportLabel(
  sportType: string,
  t: (key: string) => string,
): string {
  if (sportType === "pole_dance") return t("externalSportTypePoleDance");
  if (sportType === "calisthenics") return t("externalSportTypeCalisthenics");
  if (sportType === "other") return t("externalSportTypeOther");
  return humanizeSportType(sportType);
}

function getExternalWorkoutSourceLabel(
  source: ExternalWorkoutSource,
  t: (key: string) => string,
): string {
  if (source === "garmin") return t("externalSourceGarmin");
  if (source === "apple_health") return t("externalSourceAppleHealth");
  return t("externalSourceManual");
}

function getSessionTitle(
  session: StatisticsSession,
  t: (key: string) => string,
): string {
  if (session.entry_type === "external") {
    const sport = getExternalWorkoutSportLabel(
      session.external_sport_type ?? "other",
      t,
    );
    return `${t("manualWorkoutSessionName")}: ${sport}`;
  }
  return session.plan_name_at_time ?? t("deletedPlan");
}

function getCalendarSessionLabel(
  session: StatisticsSession,
  t: (key: string) => string,
): string {
  if (session.entry_type === "external") {
    return getExternalWorkoutSportLabel(session.external_sport_type ?? "other", t);
  }
  return getSessionTitle(session, t);
}

function mapSportTypeInputToCanonical(
  input: string,
  t: (key: string) => string,
): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ").trim();
  const isPoleDance =
    normalized === "pole dance" ||
    normalized === "pole_dance" ||
    normalized === t("externalSportTypePoleDance").toLowerCase();
  if (isPoleDance) return "pole_dance";

  const isCalisthenics =
    normalized === "calisthenics" ||
    normalized === "calisthenic" ||
    normalized === t("externalSportTypeCalisthenics").toLowerCase();
  if (isCalisthenics) return "calisthenics";

  const isOther =
    normalized === "other" || normalized === t("externalSportTypeOther").toLowerCase();
  if (isOther) return "other";

  return trimmed;
}

export function StatisticsDashboardM3({
  title,
  description,
  sessions,
  availableExternalSportTypes,
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
  const [editingExternalWorkoutId, setEditingExternalWorkoutId] = useState<
    string | null
  >(null);
  const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
  const [isSavingExternalWorkout, setIsSavingExternalWorkout] = useState(false);
  const [isDeletingExternalWorkout, setIsDeletingExternalWorkout] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] =
    useState<StatisticsSession | null>(null);
  const [externalWorkoutDate, setExternalWorkoutDate] = useState(() =>
    toDateKey(new Date()),
  );
  const [externalWorkoutDurationMinutes, setExternalWorkoutDurationMinutes] =
    useState("");
  const [externalWorkoutSportType, setExternalWorkoutSportType] =
    useState("pole_dance");
  const [externalWorkoutCalories, setExternalWorkoutCalories] = useState("");
  const [externalWorkoutAvgHeartRate, setExternalWorkoutAvgHeartRate] =
    useState("");
  const [externalWorkoutMaxHeartRate, setExternalWorkoutMaxHeartRate] =
    useState("");
  const [externalWorkoutRpe, setExternalWorkoutRpe] = useState("");
  const [externalWorkoutNotes, setExternalWorkoutNotes] = useState("");
  const [externalWorkoutSource, setExternalWorkoutSource] = useState<
    ExternalWorkoutSource | ""
  >("");
  const placeholderInputClass =
    "placeholder:!text-muted-foreground/45 placeholder:!opacity-100";
  const numberInputClass =
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const externalWorkoutSportSuggestions = useMemo(() => {
    const base = ["pole_dance", "calisthenics"];
    const values = [...base, ...availableExternalSportTypes];
    const labels = values
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) =>
        getExternalWorkoutSportLabel(
          mapSportTypeInputToCanonical(item, t),
          t,
        ),
      );
    return Array.from(new Set(labels));
  }, [availableExternalSportTypes, t]);

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
      const planName = getSessionTitle(session, t);
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
      toast.error(t("repeatPlanDeleted"));
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
        if (response.status === 404) {
          toast.error(t("repeatPlanDeleted"));
          return;
        }
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
  const selectedSessionHasPlan = Boolean(selectedSession?.workout_plan_id);
  const isStartingSelectedPlan =
    Boolean(selectedSession?.workout_plan_id) &&
    startingPlanId === selectedSession?.workout_plan_id;

  const resetExternalWorkoutForm = () => {
    setEditingExternalWorkoutId(null);
    setExternalWorkoutDate(toDateKey(new Date()));
    setExternalWorkoutDurationMinutes("");
    setExternalWorkoutSportType("");
    setExternalWorkoutCalories("");
    setExternalWorkoutAvgHeartRate("");
    setExternalWorkoutMaxHeartRate("");
    setExternalWorkoutRpe("");
    setExternalWorkoutNotes("");
    setExternalWorkoutSource("");
  };

  const openEditExternalWorkoutDialog = (session: StatisticsSession) => {
    if (session.entry_type !== "external" || !session.external_workout_id) {
      toast.error(t("manualWorkoutEditUnavailable"));
      return;
    }

    const startedAt = new Date(session.started_at);
    setEditingExternalWorkoutId(session.external_workout_id);
    setExternalWorkoutDate(toDateKey(startedAt));
    setExternalWorkoutDurationMinutes(
      String(Math.max(1, Math.round(getSessionDurationSeconds(session) / 60))),
    );
    setExternalWorkoutSportType(
      getExternalWorkoutSportLabel(session.external_sport_type ?? "other", t),
    );
    setExternalWorkoutCalories(
      typeof session.external_calories === "number"
        ? String(session.external_calories)
        : "",
    );
    setExternalWorkoutAvgHeartRate(
      typeof session.external_hr_avg === "number" ? String(session.external_hr_avg) : "",
    );
    setExternalWorkoutMaxHeartRate(
      typeof session.external_hr_max === "number" ? String(session.external_hr_max) : "",
    );
    setExternalWorkoutRpe(
      typeof session.external_intensity_rpe === "number"
        ? String(session.external_intensity_rpe)
        : "",
    );
    setExternalWorkoutNotes(session.external_notes ?? "");
    setExternalWorkoutSource(session.external_source ?? "manual");
    setSelectedSession(null);
    setIsExternalDialogOpen(true);
  };

  const handleDeleteExternalWorkout = async (session: StatisticsSession) => {
    if (session.entry_type !== "external" || !session.external_workout_id) {
      toast.error(t("manualWorkoutDeleteUnavailable"));
      return;
    }

    setIsDeletingExternalWorkout(true);
    try {
      const response = await fetch(
        `/api/external-workouts/${session.external_workout_id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(errorData.message ?? t("manualWorkoutDeleteFailed"));
        return;
      }

      toast.success(t("manualWorkoutDeleteSuccess"));
      setSelectedSession(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting external workout", error);
      toast.error(t("manualWorkoutDeleteFailed"));
    } finally {
      setIsDeletingExternalWorkout(false);
      setSessionPendingDelete(null);
    }
  };

  const handleSaveExternalWorkout = async () => {
    if (!externalWorkoutDate) {
      toast.error(t("manualWorkoutInvalidDate"));
      return;
    }

    const durationMinutes = Number(externalWorkoutDurationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      toast.error(t("manualWorkoutInvalidDuration"));
      return;
    }

    const sportType = mapSportTypeInputToCanonical(externalWorkoutSportType, t);
    if (sportType.length === 0) {
      toast.error(t("manualWorkoutInvalidSportType"));
      return;
    }

    let caloriesBurned: number | undefined;
    if (externalWorkoutCalories.trim().length > 0) {
      caloriesBurned = Number(externalWorkoutCalories);
      if (!Number.isInteger(caloriesBurned) || caloriesBurned < 0) {
        toast.error(t("manualWorkoutInvalidCalories"));
        return;
      }
    }

    let avgHeartRate: number | undefined;
    if (externalWorkoutAvgHeartRate.trim().length > 0) {
      avgHeartRate = Number(externalWorkoutAvgHeartRate);
      if (!Number.isInteger(avgHeartRate) || avgHeartRate < 1 || avgHeartRate > 260) {
        toast.error(t("manualWorkoutInvalidAvgHeartRate"));
        return;
      }
    }

    let maxHeartRate: number | undefined;
    if (externalWorkoutMaxHeartRate.trim().length > 0) {
      maxHeartRate = Number(externalWorkoutMaxHeartRate);
      if (!Number.isInteger(maxHeartRate) || maxHeartRate < 1 || maxHeartRate > 260) {
        toast.error(t("manualWorkoutInvalidMaxHeartRate"));
        return;
      }
    }
    if (
      typeof avgHeartRate === "number" &&
      typeof maxHeartRate === "number" &&
      maxHeartRate < avgHeartRate
    ) {
      toast.error(t("manualWorkoutInvalidHeartRateOrder"));
      return;
    }

    let intensityRpe: number | undefined;
    if (externalWorkoutRpe.trim().length > 0) {
      intensityRpe = Number(externalWorkoutRpe);
      if (!Number.isInteger(intensityRpe) || intensityRpe < 1 || intensityRpe > 10) {
        toast.error(t("manualWorkoutInvalidRpe"));
        return;
      }
    }

    const startedAtDate = new Date(`${externalWorkoutDate}T12:00:00`);
    if (Number.isNaN(startedAtDate.getTime())) {
      toast.error(t("manualWorkoutInvalidDate"));
      return;
    }
    const startedAt = startedAtDate.toISOString();

    const isEditing = Boolean(editingExternalWorkoutId);
    setIsSavingExternalWorkout(true);
    try {
      const response = await fetch(
        isEditing
          ? `/api/external-workouts/${editingExternalWorkoutId}`
          : "/api/external-workouts",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            started_at: startedAt,
            sport_type: sportType,
            duration_minutes: durationMinutes,
            calories: caloriesBurned,
            hr_avg: avgHeartRate,
            hr_max: maxHeartRate,
            intensity_rpe: intensityRpe,
            notes: externalWorkoutNotes.trim() || undefined,
            source: externalWorkoutSource || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(
          errorData.message ??
            t(isEditing ? "manualWorkoutUpdateFailed" : "manualWorkoutSaveFailed"),
        );
        return;
      }

      toast.success(
        t(isEditing ? "manualWorkoutUpdateSuccess" : "manualWorkoutSaveSuccess"),
      );
      setIsExternalDialogOpen(false);
      resetExternalWorkoutForm();
      router.refresh();
    } catch (error) {
      console.error("Error saving external workout", error);
      toast.error(
        t(
          isEditing ? "manualWorkoutUpdateFailed" : "manualWorkoutSaveFailed",
        ),
      );
    } finally {
      setIsSavingExternalWorkout(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />

      <Surface variant="high" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold sm:m3-title-large">
              {t("calendarTitle")}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <Button
              type="button"
              variant="outline"
              className="text-sm sm:text-base"
              onClick={() => {
                resetExternalWorkoutForm();
                setIsExternalDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("manualWorkoutAddButton")}
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
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
              <p className="min-w-32 text-center text-[10px] font-semibold capitalize sm:min-w-36 sm:text-xs md:text-sm">
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
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-[8px] font-semibold uppercase tracking-wide text-muted-foreground xs:text-[9px] sm:text-[10px] lg:text-xs">
          {dayLabels.map((label) => (
            <div key={label} className="py-1">
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
            const dayPrimarySession = daySessions[0];
            const isExternalPrimarySession =
              dayPrimarySession?.entry_type === "external";
            const dayPrimarySessionTitle = dayPrimarySession
              ? getSessionTitle(dayPrimarySession, t)
              : "";
            const dayPrimarySessionLabel = dayPrimarySession
              ? compactWorkoutLabel(getCalendarSessionLabel(dayPrimarySession, t))
              : "";

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
                <div className="mb-0.5 flex items-center justify-between sm:mb-1">
                  <span
                    className={[
                      "inline-flex size-4 items-center justify-center rounded-full text-[8px] font-semibold xs:size-5 xs:text-[9px] sm:size-7 sm:text-[11px]",
                      isToday ? "bg-primary text-primary-foreground" : "",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="mt-0.5 space-y-0.5 overflow-hidden">
                  {daySessions.length > 0 && (
                    <button
                      type="button"
                      className={[
                        "flex w-full cursor-pointer items-center rounded-md px-0.5 py-px text-left text-[7px] font-medium leading-tight sm:hidden",
                        isExternalPrimarySession
                          ? "bg-secondary/80 text-primary"
                          : "bg-primary/10 text-primary",
                      ].join(" ")}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDateKey(dayKey);
                        setSelectedSession(dayPrimarySession);
                      }}
                      title={t("openDayDetails")}
                    >
                      <span className="block w-full overflow-hidden break-words text-[8px] leading-[1.05] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {dayPrimarySessionLabel}
                      </span>
                    </button>
                  )}
                  {dayPrimarySession && (
                    <button
                      key={`${dayPrimarySession.id}-desktop`}
                      type="button"
                      className={[
                        "hidden w-full cursor-pointer rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium sm:block",
                        isExternalPrimarySession
                          ? "bg-secondary/80 text-primary hover:bg-secondary"
                          : "bg-primary/10 text-primary hover:bg-primary/20",
                      ].join(" ")}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDateKey(dayKey);
                        setSelectedSession(dayPrimarySession);
                      }}
                      title={dayPrimarySessionTitle}
                    >
                      {dayPrimarySessionLabel}
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
                        className="w-full rounded-md bg-primary/80"
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
        open={isExternalDialogOpen}
        onOpenChange={(open) => {
          setIsExternalDialogOpen(open);
          if (!open) resetExternalWorkoutForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-xl md:max-w-[576px]">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>
                {t(
                  editingExternalWorkoutId
                    ? "manualWorkoutEditDialogTitle"
                    : "manualWorkoutDialogTitle",
                )}
              </DialogTitle>
              <DialogDescription>
                {t(
                  editingExternalWorkoutId
                    ? "manualWorkoutEditDialogDescription"
                    : "manualWorkoutDialogDescription",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-workout-date">{t("manualWorkoutDateLabel")}</Label>
                  <Input
                    id="manual-workout-date"
                    type="date"
                    value={externalWorkoutDate}
                    onChange={(event) => setExternalWorkoutDate(event.target.value)}
                    max={toDateKey(new Date())}
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-duration">
                    {t("manualWorkoutDurationLabel")}
                  </Label>
                  <Input
                    id="manual-workout-duration"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${placeholderInputClass} ${numberInputClass}`}
                    value={externalWorkoutDurationMinutes}
                    onChange={(event) => setExternalWorkoutDurationMinutes(event.target.value)}
                    autoComplete="off"
                    placeholder="np. 45"
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-sport-type">
                    {t("manualWorkoutSportTypeLabel")}
                  </Label>
                  <Input
                    id="manual-workout-sport-type"
                    type="text"
                    className={placeholderInputClass}
                    value={externalWorkoutSportType}
                    onChange={(event) => setExternalWorkoutSportType(event.target.value)}
                    list="manual-workout-sport-type-suggestions"
                    autoComplete="off"
                    placeholder={t("manualWorkoutSportTypePlaceholder")}
                    disabled={isSavingExternalWorkout}
                  />
                  <datalist id="manual-workout-sport-type-suggestions">
                    {externalWorkoutSportSuggestions.map((sportType) => (
                      <option key={sportType} value={sportType} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-calories">
                    {t("manualWorkoutCaloriesLabel")}
                  </Label>
                  <Input
                    id="manual-workout-calories"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${placeholderInputClass} ${numberInputClass}`}
                    value={externalWorkoutCalories}
                    onChange={(event) => setExternalWorkoutCalories(event.target.value)}
                    autoComplete="off"
                    placeholder="np. 420"
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-source">
                    {t("manualWorkoutSourceLabel")}
                  </Label>
                  <Select
                    value={externalWorkoutSource || undefined}
                    onValueChange={(value) =>
                      setExternalWorkoutSource(value as ExternalWorkoutSource)
                    }
                    disabled={isSavingExternalWorkout}
                  >
                    <SelectTrigger
                      id="manual-workout-source"
                      className="w-full data-[placeholder]:!text-muted-foreground/45"
                    >
                      <SelectValue placeholder={t("manualWorkoutSourcePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t("externalSourceManual")}</SelectItem>
                      <SelectItem value="garmin">{t("externalSourceGarmin")}</SelectItem>
                      <SelectItem value="apple_health">
                        {t("externalSourceAppleHealth")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-avg-heart-rate">
                    {t("manualWorkoutAvgHeartRateLabel")}
                  </Label>
                  <Input
                    id="manual-workout-avg-heart-rate"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${placeholderInputClass} ${numberInputClass}`}
                    value={externalWorkoutAvgHeartRate}
                    onChange={(event) => setExternalWorkoutAvgHeartRate(event.target.value)}
                    autoComplete="off"
                    placeholder="np. 142"
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-max-heart-rate">
                    {t("manualWorkoutMaxHeartRateLabel")}
                  </Label>
                  <Input
                    id="manual-workout-max-heart-rate"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${placeholderInputClass} ${numberInputClass}`}
                    value={externalWorkoutMaxHeartRate}
                    onChange={(event) => setExternalWorkoutMaxHeartRate(event.target.value)}
                    autoComplete="off"
                    placeholder="np. 178"
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-rpe">{t("manualWorkoutRpeLabel")}</Label>
                  <Input
                    id="manual-workout-rpe"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`${placeholderInputClass} ${numberInputClass}`}
                    value={externalWorkoutRpe}
                    onChange={(event) => setExternalWorkoutRpe(event.target.value)}
                    autoComplete="off"
                    placeholder="np. 7"
                    disabled={isSavingExternalWorkout}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-workout-notes">{t("manualWorkoutNotesLabel")}</Label>
                  <Textarea
                    id="manual-workout-notes"
                    className={placeholderInputClass}
                    value={externalWorkoutNotes}
                    onChange={(event) => setExternalWorkoutNotes(event.target.value)}
                    placeholder={t("manualWorkoutNotesPlaceholder")}
                    disabled={isSavingExternalWorkout}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsExternalDialogOpen(false);
                  resetExternalWorkoutForm();
                }}
                disabled={isSavingExternalWorkout}
              >
                {t("manualWorkoutCancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSaveExternalWorkout}
                disabled={isSavingExternalWorkout}
              >
                {isSavingExternalWorkout
                  ? t("manualWorkoutSaving")
                  : t(
                      editingExternalWorkoutId
                        ? "manualWorkoutUpdate"
                        : "manualWorkoutSave",
                    )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedSession)}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
      >
        {selectedSession && (
          <DialogContent
            className={[
              "sm:max-w-xl [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:border [&>[data-slot=dialog-close]]:border-transparent [&>[data-slot=dialog-close]]:hover:border-border [&>[data-slot=dialog-close]]:hover:bg-accent [&>[data-slot=dialog-close]]:hover:text-foreground [&>[data-slot=dialog-close]]:hover:opacity-100",
              selectedSession.entry_type === "external" ? "pt-14" : "",
            ].join(" ")}
          >
            {selectedSession.entry_type === "external" && (
              <CardActionButtons
                onEdit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openEditExternalWorkoutDialog(selectedSession);
                }}
                onDelete={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (
                    isDeletingExternalWorkout ||
                    selectedSession.entry_type !== "external"
                  ) {
                    return;
                  }
                  setSessionPendingDelete(selectedSession);
                }}
                editAriaLabel={t("manualWorkoutEdit")}
                deleteAriaLabel={t("manualWorkoutDelete")}
                editDisabled={isDeletingExternalWorkout}
                deleteDisabled={isDeletingExternalWorkout}
                alwaysVisible
                positionClassName="right-14 top-4"
              />
            )}
            <DialogHeader>
              <DialogTitle>{getSessionTitle(selectedSession, t)}</DialogTitle>
              <DialogDescription>{t("sessionDetailsModalSubtitle")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">{t("sessionDateLabel")}</span>
                  <span className="font-medium text-right leading-tight">
                    {formatShortDate(new Date(selectedSession.started_at))}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("sessionDurationLabel")}</span>
                  <span className="font-medium">
                    {formatMinutes(selectedSessionDurationMinutes, t)}
                  </span>
                </div>
                {selectedSession.entry_type === "session" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("sessionExercisesLabel")}</span>
                    <span className="font-medium">{selectedSession.exercise_count ?? 0}</span>
                  </div>
                )}
                {selectedSession.entry_type === "external" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("sessionExternalSportTypeLabel")}
                    </span>
                    <span className="font-medium">
                      {getExternalWorkoutSportLabel(
                        selectedSession.external_sport_type ?? "other",
                        t,
                      )}
                    </span>
                  </div>
                )}
                {selectedSession.entry_type === "external" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("sessionExternalSourceLabel")}
                    </span>
                    <span className="font-medium">
                      {getExternalWorkoutSourceLabel(
                        selectedSession.external_source ?? "manual",
                        t,
                      )}
                    </span>
                  </div>
                )}
                {typeof selectedSession.external_calories === "number" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("sessionCaloriesLabel")}</span>
                    <span className="font-medium">
                      {selectedSession.external_calories} kcal
                    </span>
                  </div>
                )}
                {typeof selectedSession.external_hr_avg === "number" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {t("sessionAvgHeartRateLabel")}
                    </span>
                    <span className="font-medium">
                      {selectedSession.external_hr_avg} bpm
                    </span>
                  </div>
                )}
                {typeof selectedSession.external_hr_max === "number" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("sessionMaxHeartRateLabel")}</span>
                    <span className="font-medium">
                      {selectedSession.external_hr_max} bpm
                    </span>
                  </div>
                )}
                {typeof selectedSession.external_intensity_rpe === "number" && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t("sessionRpeLabel")}</span>
                    <span className="font-medium">
                      {selectedSession.external_intensity_rpe}/10
                    </span>
                  </div>
                )}
              </div>

              {selectedSession.external_notes && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-sm font-medium">{t("sessionNotesLabel")}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.external_notes}
                  </p>
                </div>
              )}

              {selectedSession.exercise_names && selectedSession.exercise_names.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-sm font-medium">{t("sessionExerciseNamesLabel")}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSession.exercise_names.join(", ")}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedSession.entry_type === "session" && (
                  <Button asChild variant="outline" onClick={() => setSelectedSession(null)}>
                    <Link href={`/workout-sessions/${selectedSession.id}`}>
                      {t("openDetails")}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
                {selectedSession.entry_type === "session" && (
                  <Button
                    type="button"
                    onClick={() => handleRepeatPlan(selectedSession.workout_plan_id)}
                    disabled={!selectedSessionHasPlan || isStartingSelectedPlan}
                  >
                    {isStartingSelectedPlan ? t("startingPlan") : t("repeatPlan")}
                  </Button>
                )}
              </div>
              {selectedSession.entry_type === "session" && !selectedSessionHasPlan && (
                <p className="text-sm text-muted-foreground">
                  {t("repeatPlanDeleted")}
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog
        open={Boolean(sessionPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingExternalWorkout) {
            setSessionPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manualWorkoutDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("manualWorkoutDeleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingExternalWorkout}>
              {t("manualWorkoutCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!sessionPendingDelete) return;
                void handleDeleteExternalWorkout(sessionPendingDelete);
              }}
              disabled={isDeletingExternalWorkout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingExternalWorkout
                ? t("manualWorkoutDeleting")
                : t("manualWorkoutDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
