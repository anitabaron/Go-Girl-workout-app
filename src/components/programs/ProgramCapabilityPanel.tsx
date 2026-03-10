"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { movementKeyValues, type MovementKey } from "@/lib/training/movement-keys";
import type { UserCapabilityProfileDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TrainingStateSnapshot = {
  readiness_score: number;
  readiness_drivers: string[];
  external_workouts_last_7d: number;
  external_duration_minutes_last_7d: number;
  fatigue_notes_last_14d: number;
  average_external_rpe_last_7d?: number | null;
};

type ProgramCapabilityPanelProps = {
  initialProfiles: UserCapabilityProfileDTO[];
  initialTrainingState: TrainingStateSnapshot;
};

type EditableCapability = {
  id?: string;
  movement_key: MovementKey;
  comfort_max_reps: string;
  comfort_max_duration_seconds: string;
  confidence_score: string;
  pain_flag: boolean;
  pain_notes: string;
};

function toEditable(profile: UserCapabilityProfileDTO): EditableCapability {
  return {
    id: profile.id,
    movement_key: profile.movement_key,
    comfort_max_reps: profile.comfort_max_reps?.toString() ?? "",
    comfort_max_duration_seconds:
      profile.comfort_max_duration_seconds?.toString() ?? "",
    confidence_score: profile.confidence_score.toString(),
    pain_flag: profile.pain_flag,
    pain_notes: profile.pain_notes ?? "",
  };
}

function movementLabel(value: MovementKey): string {
  return value.replaceAll("_", " ");
}

export function ProgramCapabilityPanel({
  initialProfiles,
  initialTrainingState,
}: Readonly<ProgramCapabilityPanelProps>) {
  const [profiles, setProfiles] = useState<EditableCapability[]>(
    initialProfiles.map(toEditable),
  );
  const [trainingState, setTrainingState] =
    useState<TrainingStateSnapshot>(initialTrainingState);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newMovementKey, setNewMovementKey] = useState<MovementKey>("core_hold");

  const knownMovementKeys = useMemo(
    () => new Set(profiles.map((profile) => profile.movement_key)),
    [profiles],
  );

  const refreshState = async () => {
    try {
      const [profilesResponse, trainingStateResponse] = await Promise.all([
        fetch("/api/ai/capability-profiles", { cache: "no-store" }),
        fetch("/api/ai/training-state", { cache: "no-store" }),
      ]);

      if (profilesResponse.ok) {
        const profilesData = (await profilesResponse.json()) as {
          items?: UserCapabilityProfileDTO[];
        };
        setProfiles((profilesData.items ?? []).map(toEditable));
      }

      if (trainingStateResponse.ok) {
        const trainingStateData =
          (await trainingStateResponse.json()) as TrainingStateSnapshot;
        setTrainingState(trainingStateData);
      }
    } catch (error) {
      console.error("[ProgramCapabilityPanel] refresh failed", error);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      void refreshState();
    };
    window.addEventListener("ai:training-state-refresh", handleRefresh);
    return () => {
      window.removeEventListener("ai:training-state-refresh", handleRefresh);
    };
  }, []);

  const updateProfile = (
    movementKey: MovementKey,
    patch: Partial<EditableCapability>,
  ) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.movement_key === movementKey ? { ...profile, ...patch } : profile,
      ),
    );
  };

  const handleSave = async (profile: EditableCapability) => {
    const isNew = !profile.id;
    setSavingKey(profile.movement_key);
    try {
      const body = {
        movement_key: profile.movement_key,
        comfort_max_reps: profile.comfort_max_reps
          ? Number(profile.comfort_max_reps)
          : null,
        comfort_max_duration_seconds: profile.comfort_max_duration_seconds
          ? Number(profile.comfort_max_duration_seconds)
          : null,
        confidence_score: profile.confidence_score
          ? Number(profile.confidence_score)
          : 60,
        pain_flag: profile.pain_flag,
        pain_notes: profile.pain_notes.trim() || null,
        updated_from: "manual",
      };

      const response = await fetch(
        isNew
          ? "/api/ai/capability-profiles"
          : `/api/ai/capability-profiles/${profile.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Nie udało się zapisać profilu możliwości.");
      }

      toast.success("Profil możliwości zapisany.");
      await refreshState();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać profilu możliwości.",
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleAddMovement = () => {
    if (knownMovementKeys.has(newMovementKey)) {
      toast.message("Ten wzorzec już istnieje na liście.");
      return;
    }

    setProfiles((prev) => [
      ...prev,
      {
        movement_key: newMovementKey,
        comfort_max_reps: "",
        comfort_max_duration_seconds: "",
        confidence_score: "60",
        pain_flag: false,
        pain_notes: "",
      },
    ]);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Możliwości i gotowość</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI używa tych danych do ograniczania progresji i korekty planu.
          </p>
        </div>
        <Badge variant={trainingState.readiness_score >= 70 ? "secondary" : "outline"}>
          Gotowość {trainingState.readiness_score}/100
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">External load 7d</p>
          <p className="mt-1 text-lg font-semibold">
            {trainingState.external_workouts_last_7d}
          </p>
          <p className="text-xs text-muted-foreground">
            {trainingState.external_duration_minutes_last_7d} min
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Fatigue notes 14d</p>
          <p className="mt-1 text-lg font-semibold">
            {trainingState.fatigue_notes_last_14d}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Średnie RPE zewnętrzne</p>
          <p className="mt-1 text-lg font-semibold">
            {trainingState.average_external_rpe_last_7d ?? "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card/70 p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Legenda</p>
        <div className="mt-2 space-y-1">
          <p>
            <strong>Gotowość 0-100</strong>: ogólna ocena, czy AI powinna zacząć
            ostrożniej czy może pozwolić na normalną progresję.
          </p>
          <p>
            <strong>External load 7d</strong>: liczba treningów poza aplikacją z ostatnich 7
            dni i ich łączny czas.
          </p>
          <p>
            <strong>Fatigue notes 14d</strong>: ile razy w notatkach z ostatnich 14 dni
            pojawił się wysoki poziom zmęczenia.
          </p>
          <p>
            <strong>Średnie RPE zewnętrzne</strong>: średnia trudność treningów poza
            aplikacją, jeśli była zapisana.
          </p>
          <p>
            <strong>Wzorzec</strong>: typ zdolności, np. <em>core hold</em> to
            wytrzymanie pozycji core, <em>vertical pull</em> to ruchy przyciągania w pionie,
            a <em>handstand support</em> to podparcie i kontrola barków w pozycjach odwróconych.
          </p>
          <p>
            <strong>Comfort max</strong>: bezpieczny, realny limit na dziś. AI nie powinna
            go przekraczać agresywnie.
          </p>
          <p>
            <strong>Confidence score</strong>: jak bardzo system ufa, że obecne limity są
            trafne. Niższy wynik oznacza bardziej ostrożne propozycje.
          </p>
          <p>
            <strong>Pain flag</strong>: aktywne przeciążenie lub ból. Wtedy AI powinna
            obniżać objętość albo unikać progresji dla tego wzorca.
          </p>
        </div>
      </div>

      {trainingState.readiness_drivers.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Co obniża gotowość</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {trainingState.readiness_drivers.map((driver) => (
              <Badge key={driver} variant="outline">
                {driver}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            Dodaj wzorzec
            <select
              value={newMovementKey}
              onChange={(event) =>
                setNewMovementKey(event.target.value as MovementKey)
              }
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {movementKeyValues.map((value) => (
                <option key={value} value={value}>
                  {movementLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddMovement}>
            Dodaj
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {profiles.length > 0 ? (
          profiles.map((profile) => (
            <article
              key={profile.id ?? profile.movement_key}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize">
                  {movementLabel(profile.movement_key)}
                </p>
                <Badge variant={profile.pain_flag ? "destructive" : "outline"}>
                  {profile.pain_flag ? "Pain flag" : "OK"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Comfort max reps
                  <Input
                    type="number"
                    min={1}
                    value={profile.comfort_max_reps}
                    onChange={(event) =>
                      updateProfile(profile.movement_key, {
                        comfort_max_reps: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Comfort max duration (s)
                  <Input
                    type="number"
                    min={1}
                    value={profile.comfort_max_duration_seconds}
                    onChange={(event) =>
                      updateProfile(profile.movement_key, {
                        comfort_max_duration_seconds: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Confidence score
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={profile.confidence_score}
                    onChange={(event) =>
                      updateProfile(profile.movement_key, {
                        confidence_score: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="mt-3 space-y-2">
                <Label>
                  <Checkbox
                    checked={profile.pain_flag}
                    onCheckedChange={(checked) =>
                      updateProfile(profile.movement_key, {
                        pain_flag: checked === true,
                      })
                    }
                  />
                  Aktywna flaga bólu
                </Label>
                <Textarea
                  value={profile.pain_notes}
                  onChange={(event) =>
                    updateProfile(profile.movement_key, {
                      pain_notes: event.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Np. bark przeciążony po handstandzie"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSave(profile)}
                  disabled={savingKey === profile.movement_key}
                >
                  {savingKey === profile.movement_key ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Brak profili możliwości. Dodaj pierwszy wzorzec, aby ręcznie korygować limity AI.
          </p>
        )}
      </div>
    </section>
  );
}
