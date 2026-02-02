"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PersonalRecordMetricVM,
  PersonalRecordMetricViewModel,
  SeriesValues,
} from "@/lib/personal-records/view-model";

type EditPersonalRecordDialogM3Props = {
  readonly metric: PersonalRecordMetricVM | PersonalRecordMetricViewModel;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved?: () => void;
};

function getValueInputProps(metricType: PersonalRecordMetricVM["metricType"]) {
  switch (metricType) {
    case "total_reps":
      return { type: "number" as const, min: 0, step: 1, suffix: "" };
    case "max_duration":
      return { type: "number" as const, min: 0, step: 1, suffix: " s" };
    case "max_weight":
      return { type: "number" as const, min: 0, step: 0.1, suffix: " kg" };
    default:
      return { type: "number" as const, min: 0, step: 1, suffix: "" };
  }
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

function seriesToArray(series: SeriesValues | null): { key: string; value: number }[] {
  if (!series || Object.keys(series).length === 0) return [];
  return Object.keys(series)
    .sort((a, b) => Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10))
    .map((key) => ({ key, value: series[key] ?? 0 }));
}

function arrayToSeries(arr: { key: string; value: number }[]): SeriesValues | null {
  if (arr.length === 0) return null;
  const result: SeriesValues = {};
  for (const { key, value } of arr) {
    result[key] = value;
  }
  return result;
}

function computeValueFromSeries(
  metricType: PersonalRecordMetricVM["metricType"],
  series: { key: string; value: number }[],
): number {
  if (series.length === 0) return 0;
  const values = series.map((s) => s.value);
  switch (metricType) {
    case "total_reps":
      return values.reduce((a, b) => a + b, 0);
    case "max_duration":
    case "max_weight":
      return Math.max(...values);
    default:
      return values[0] ?? 0;
  }
}

export function EditPersonalRecordDialogM3({
  metric,
  open,
  onOpenChange,
  onSaved,
}: EditPersonalRecordDialogM3Props) {
  const router = useRouter();
  const [value, setValue] = useState(metric.value);
  const [series, setSeries] = useState<{ key: string; value: number }[]>(() =>
    seriesToArray(metric.seriesValues),
  );
  const [achievedAt, setAchievedAt] = useState(toDatetimeLocal(metric.achievedAtIso));
  const [isSaving, setIsSaving] = useState(false);

  const inputProps = getValueInputProps(metric.metricType);

  useEffect(() => {
    if (open) {
      setValue(metric.value);
      setSeries(seriesToArray(metric.seriesValues));
      setAchievedAt(toDatetimeLocal(metric.achievedAtIso));
    }
  }, [open, metric.value, metric.seriesValues, metric.achievedAtIso]);

  const handleSeriesUpdate = useCallback(
    (index: number, newValue: number) => {
      setSeries((prev) => {
        const next = [...prev];
        next[index] = { ...next[index]!, value: newValue };
        return next;
      });
    },
    [],
  );

  const handleSeriesAdd = useCallback(() => {
    const nextNum = series.length + 1;
    setSeries((prev) => [...prev, { key: `S${nextNum}`, value: 0 }]);
  }, [series.length]);

  const handleSeriesRemove = useCallback(
    (index: number) => {
      setSeries((prev) => {
        const next = prev.filter((_, i) => i !== index);
        const rekeyed = next.map((s, i) => ({ key: `S${i + 1}`, value: s.value }));
        if (rekeyed.length === 0) {
          const computed = computeValueFromSeries(metric.metricType, prev);
          setValue(computed);
        }
        return rekeyed;
      });
    },
    [metric.metricType],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const seriesObj = arrayToSeries(series);
    const finalValue =
      series.length > 0
        ? computeValueFromSeries(metric.metricType, series)
        : metric.metricType === "max_weight"
          ? Number(value)
          : Math.round(Number(value));

    if (Number.isNaN(finalValue) || finalValue < 0) {
      toast.error("Wprowadź prawidłową wartość");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/personal-records/record/${metric.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: finalValue,
          series_values: seriesObj,
          achieved_at: fromDatetimeLocal(achievedAt),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || "Nie udało się zapisać rekordu");
        return;
      }

      toast.success("Rekord zapisany");
      onSaved?.();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
      } else {
        toast.error("Wystąpił błąd podczas zapisywania rekordu");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-[var(--m3-radius-lg)] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container)] sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="m3-title">Edytuj rekord</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-pr-value" className="m3-label">
              {metric.label}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-pr-value"
                type={inputProps.type}
                min={inputProps.min}
                step={inputProps.step}
                value={series.length > 0 ? computeValueFromSeries(metric.metricType, series) : value}
                onChange={(e) => setValue(Number(e.target.value) || 0)}
                className="m3-body"
                required
                readOnly={series.length > 0}
              />
              {inputProps.suffix && (
                <span className="m3-body text-muted-foreground shrink-0">
                  {inputProps.suffix}
                </span>
              )}
            </div>
            {series.length > 0 && (
              <p className="m3-body text-muted-foreground text-xs">
                Wartość obliczona z serii
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="m3-label">Serie</Label>
            {series.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSeriesAdd}
                className="w-full"
              >
                <Plus className="size-4 mr-2" />
                Dodaj serię
              </Button>
            ) : (
              <div className="space-y-2">
                {series.map((s, index) => (
                  <div
                    key={s.key}
                    className="flex items-center gap-2 rounded-md border border-[var(--m3-outline-variant)] p-2"
                  >
                    <span className="m3-label shrink-0 w-8">{s.key}</span>
                    <Input
                      type={inputProps.type}
                      min={inputProps.min}
                      step={inputProps.step}
                      value={s.value}
                      onChange={(e) =>
                        handleSeriesUpdate(
                          index,
                          metric.metricType === "max_weight"
                            ? Number(e.target.value)
                            : Math.round(Number(e.target.value) || 0),
                        )
                      }
                      className="m3-body flex-1"
                    />
                    {inputProps.suffix && (
                      <span className="m3-body text-muted-foreground text-sm shrink-0">
                        {inputProps.suffix}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleSeriesRemove(index)}
                      aria-label={`Usuń ${s.key}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSeriesAdd}
                >
                  <Plus className="size-4 mr-2" />
                  Dodaj serię
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-pr-date" className="m3-label">
              Data osiągnięcia
            </Label>
            <Input
              id="edit-pr-date"
              type="datetime-local"
              value={achievedAt}
              onChange={(e) => setAchievedAt(e.target.value)}
              className="m3-body"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving} className="m3-cta" aria-busy={isSaving}>
              {isSaving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
