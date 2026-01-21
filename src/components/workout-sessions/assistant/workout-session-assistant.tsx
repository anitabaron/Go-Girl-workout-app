"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import type { SessionDetailDTO } from "@/types";
import {
  type ExerciseFormData,
  type FormErrors,
  type AutosaveStatus,
  type SetLogFormData,
  exerciseToFormData,
  formDataToAutosaveCommand,
} from "@/types/workout-session-assistant";
import { WorkoutTimer } from "./workout-timer";
import { ExerciseTimer } from "./exercise-timer";
import { CurrentExerciseInfo } from "./current-exercise-info";
import { ExerciseExecutionForm } from "./exercise-execution-form";
import { NavigationButtons } from "./navigation-buttons";
import { AutosaveIndicator } from "./autosave-indicator";
import { ExitSessionButton } from "./exit-session-button";

export type WorkoutSessionAssistantProps = {
  readonly sessionId: string;
  readonly initialSession: SessionDetailDTO;
};

/**
 * Główny komponent asystenta treningowego.
 * Zarządza stanem sesji, synchronizacją z API, nawigacją między ćwiczeniami
 * oraz koordynacją wszystkich podkomponentów.
 */
export function WorkoutSessionAssistant({
  sessionId,
  initialSession,
}: Readonly<WorkoutSessionAssistantProps>) {
  const router = useRouter();
  const pathname = usePathname();

  // Stan sesji
  const [session, setSession] = useState<SessionDetailDTO>(initialSession);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(
    () => {
      // Ustaw currentExerciseIndex na podstawie current_position lub 0
      const position = session.current_position ?? 0;
      return position > 0
        ? Math.min(position - 1, session.exercises.length - 1)
        : 0;
    }
  );
  const [isPaused, setIsPaused] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>(() =>
    exerciseToFormData(
      session.exercises[currentExerciseIndex] || session.exercises[0]
    )
  );
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | undefined>();
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(1);
  
  // Ref do śledzenia, czy timer został już uruchomiony (zapobiega pętli)
  const timerInitializedRef = useRef(false);
  
  // Ref do przechowywania aktualnych wartości timera (używane w stopTimer, aby uniknąć zależności)
  const timerStateRef = useRef({
    lastTimerStartedAt: initialSession.last_timer_started_at,
    lastTimerStoppedAt: initialSession.last_timer_stopped_at,
  });
  
  // Ref do śledzenia poprzedniego sessionId (do resetowania przy zmianie sesji)
  const previousSessionIdRef = useRef<string>(sessionId);
  
  // Ref do śledzenia, czy auto-pauza została już wykonana dla bieżącej ścieżki
  const autoPauseExecutedRef = useRef<string | null>(null);
  
  // Resetuj refy i aktualizuj stan przy zmianie sessionId (nowa sesja)
  useEffect(() => {
    // Jeśli sessionId się zmienił, resetuj wszystko dla nowej sesji
    if (previousSessionIdRef.current !== sessionId) {
      previousSessionIdRef.current = sessionId;
      timerInitializedRef.current = false; // Resetuj flagę inicjalizacji
      
      // Zaktualizuj stan sesji na podstawie nowego initialSession
      setSession(initialSession);
      
      // Zaktualizuj refy timera
      timerStateRef.current = {
        lastTimerStartedAt: initialSession.last_timer_started_at,
        lastTimerStoppedAt: initialSession.last_timer_stopped_at,
      };
    }
  }, [sessionId, initialSession]);
  
  // Aktualizuj ref przy zmianie stanu sesji (dla bieżącej sesji)
  useEffect(() => {
    timerStateRef.current = {
      lastTimerStartedAt: session.last_timer_started_at,
      lastTimerStoppedAt: session.last_timer_stopped_at,
    };
  }, [session.last_timer_started_at, session.last_timer_stopped_at]);

  // Bieżące ćwiczenie
  const currentExercise = useMemo(
    () => session.exercises[currentExerciseIndex],
    [session.exercises, currentExerciseIndex]
  );

  // Walidacja formularza
  const validateForm = useCallback((data: ExerciseFormData): FormErrors => {
    const errors: FormErrors = {};

    // Jeśli ćwiczenie jest pominięte, walidacja nie jest wymagana
    if (data.is_skipped) {
      return errors;
    }

    // Walidacja set logs: każda seria musi mieć co najmniej jedną metrykę >= 0
    if (data.sets.length === 0) {
      errors._form = [
        "Dodaj co najmniej jedną serię lub zaznacz 'Pomiń ćwiczenie'",
      ];
      return errors;
    }

    const setErrors: Record<number, string> = {};
    let hasValidSet = false;

    data.sets.forEach((set, index) => {
      const hasReps = set.reps !== null && set.reps >= 0;
      const hasDuration =
        set.duration_seconds !== null && set.duration_seconds >= 0;
      const hasWeight = set.weight_kg !== null && set.weight_kg >= 0;

      if (!hasReps && !hasDuration && !hasWeight) {
        setErrors[index] =
          "Podaj co najmniej jedną metrykę (powtórzenia, czas lub wagę)";
      } else {
        hasValidSet = true;
      }

      // Walidacja wartości >= 0
      if (set.reps !== null && set.reps < 0) {
        setErrors[index] = "Liczba powtórzeń nie może być ujemna";
      }
      if (set.duration_seconds !== null && set.duration_seconds < 0) {
        setErrors[index] = "Czas trwania nie może być ujemny";
      }
      if (set.weight_kg !== null && set.weight_kg < 0) {
        setErrors[index] = "Waga nie może być ujemna";
      }
    });

    if (Object.keys(setErrors).length > 0) {
      errors.sets = setErrors;
    }

    if (!hasValidSet) {
      errors._form = [
        "Dodaj co najmniej jedną serię z metrykami lub zaznacz 'Pomiń ćwiczenie'",
      ];
    }

    return errors;
  }, []);

  // Uruchomienie timera przy wejściu do asystenta (jeśli nie jest już uruchomiony)
  // Resetuje się przy zmianie sessionId dzięki timerInitializedRef.current = false w poprzednim useEffect
  useEffect(() => {
    // Jeśli timer został już zainicjalizowany dla tej sesji, nie uruchamiaj ponownie
    if (timerInitializedRef.current) {
      return;
    }

    // Sprawdź, czy timer jest już uruchomiony (używamy ref, aby uniknąć zależności od session)
    const timerStarted = timerStateRef.current.lastTimerStartedAt !== null;
    const timerStopped = timerStateRef.current.lastTimerStoppedAt !== null;
    const lastTimerStartedAt = timerStateRef.current.lastTimerStartedAt;
    const lastTimerStoppedAt = timerStateRef.current.lastTimerStoppedAt;
    
    // Jeśli timer nie jest uruchomiony, uruchom go
    // Jeśli timer został zatrzymany po ostatnim starcie, uruchom go ponownie
    let shouldStart = !timerStarted;
    if (timerStarted && timerStopped && lastTimerStartedAt && lastTimerStoppedAt) {
      const startedTime = new Date(lastTimerStartedAt).getTime();
      const stoppedTime = new Date(lastTimerStoppedAt).getTime();
      // Jeśli ostatnie zatrzymanie jest nowsze niż ostatni start, timer został zatrzymany i można go wznowić
      if (stoppedTime >= startedTime) {
        shouldStart = true;
      }
    }
    
    if (shouldStart) {
      timerInitializedRef.current = true; // Oznacz jako zainicjalizowany przed wywołaniem API
      
      const now = new Date().toISOString();
      fetch(`/api/workout-sessions/${sessionId}/timer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_timer_started_at: now,
        }),
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("Failed to start timer");
        })
        .then((result) => {
          // Aktualizuj stan sesji z odpowiedzi API
          if (result.data) {
            setSession((prev) => ({
              ...prev,
              active_duration_seconds: result.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
              last_timer_started_at: result.data.last_timer_started_at ?? prev.last_timer_started_at,
              last_timer_stopped_at: result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
            }));
          }
        })
        .catch((error) => {
          console.error("[WorkoutSessionAssistant] Error starting timer:", error);
          timerInitializedRef.current = false; // W przypadku błędu, pozwól na ponowną próbę
        });
    } else {
      // Timer jest już uruchomiony, oznacz jako zainicjalizowany
      timerInitializedRef.current = true;
    }
  }, [sessionId]); // Tylko sessionId w zależnościach - stan sprawdzamy przez ref

  // Automatyczne ukrywanie toasta "Zapisano" po 3 sekundach
  useEffect(() => {
    if (autosaveStatus === "saved") {
      const timer = setTimeout(() => {
        setAutosaveStatus("idle");
      }, 3000); // 3 sekundy

      return () => clearTimeout(timer);
    }
  }, [autosaveStatus]);

  // Aktualizacja formData przy zmianie ćwiczenia
  useEffect(() => {
    if (currentExercise) {
      const newFormData = exerciseToFormData(currentExercise);
      setFormData(newFormData);
      setFormErrors({});
      // Reset numeru serii przy zmianie ćwiczenia
      setCurrentSetNumber(1);
      // Upewnij się, że formularz ma pierwszą serię (jeśli nie ma serii, ale są planowane)
      if (
        newFormData.sets.length === 0 &&
        (currentExercise.planned_sets ?? 0) > 0
      ) {
        // Formularz automatycznie utworzy serie w ExerciseExecutionForm
        // Nie musimy tutaj nic robić
      }
    }
  }, [currentExercise]);

  // Zapisywanie stanu ćwiczenia przez API
  const saveExercise = useCallback(
    async (
      data: ExerciseFormData,
      advanceCursor: boolean
    ): Promise<boolean> => {
      setAutosaveStatus("saving");
      setAutosaveError(undefined);

      try {
        const command = formDataToAutosaveCommand(data, advanceCursor);

        const url = `/api/workout-sessions/${sessionId}/exercises/${currentExercise.exercise_order}`;

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[WorkoutSessionAssistant.saveExercise] Error response:", errorData);
          throw new Error(errorData.message || "Błąd zapisu ćwiczenia");
        }

        const result = await response.json();
        const updatedExercise = result.data;

        // Aktualizuj sesję z odpowiedzi
        setSession((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.exercise_order === currentExercise.exercise_order ? updatedExercise : ex
          ),
          current_position:
            result.data.cursor?.current_position ?? prev.current_position,
        }));

        setAutosaveStatus("saved");
        return true;
      } catch (error) {
        console.error("[WorkoutSessionAssistant.saveExercise] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Błąd zapisu ćwiczenia";
        setAutosaveError(errorMessage);
        setAutosaveStatus("error");
        toast.error(errorMessage);
        return false;
      }
    },
    [sessionId, currentExercise.exercise_order]
  );

  // Obsługa nawigacji next
  const handleNext = useCallback(async () => {
    // Walidacja przed zapisem
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0 && !formData.is_skipped) {
      setFormErrors(errors);
      toast.error("Popraw błędy w formularzu przed zapisem");
      return;
    }

    // Zapisz i przejdź dalej
    const success = await saveExercise(formData, true);
    if (!success) {
      return;
    }

    // Przejście do następnego ćwiczenia
    if (currentExerciseIndex < session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Ostatnie ćwiczenie - zakończ sesję
      try {
        const response = await fetch(
          `/api/workout-sessions/${sessionId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          }
        );

        if (response.ok) {
          toast.success("Sesja treningowa zakończona!");
          router.push(`/workout-sessions/${sessionId}`);
        } else {
          toast.error("Błąd podczas zakończenia sesji");
        }
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    formData,
    validateForm,
    saveExercise,
    currentExerciseIndex,
    session.exercises.length,
    sessionId,
    router,
  ]);

  // Obsługa nawigacji previous
  const handlePrevious = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setFormErrors({});
    }
  }, [currentExerciseIndex]);

  // Obsługa pause
  const handlePause = useCallback(async () => {
    // Zapisz stan bez przesuwania kursora
    await saveExercise(formData, false);

    // Zatrzymaj timer przez API
    const now = new Date().toISOString();
    try {
      const timerResponse = await fetch(
        `/api/workout-sessions/${sessionId}/timer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            last_timer_stopped_at: now,
          }),
        }
      );

      if (timerResponse.ok) {
        const timerResult = await timerResponse.json();
        // Aktualizuj stan sesji z odpowiedzi API
        if (timerResult.data) {
          setSession((prev) => ({
            ...prev,
            active_duration_seconds: timerResult.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
            last_timer_started_at: timerResult.data.last_timer_started_at ?? prev.last_timer_started_at,
            last_timer_stopped_at: timerResult.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
          }));
        }
        setIsPaused(true);
      } else {
        toast.error("Błąd podczas pauzowania timera");
      }
    } catch {
      toast.error("Błąd podczas pauzowania timera");
    }
  }, [formData, saveExercise, sessionId]);

  // Obsługa resume
  const handleResume = useCallback(async () => {
    // Wznów timer przez API
    const now = new Date().toISOString();
    try {
      const timerResponse = await fetch(
        `/api/workout-sessions/${sessionId}/timer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            last_timer_started_at: now,
          }),
        }
      );

      if (timerResponse.ok) {
        const timerResult = await timerResponse.json();
        // Aktualizuj stan sesji z odpowiedzi API
        if (timerResult.data) {
          setSession((prev) => ({
            ...prev,
            active_duration_seconds: timerResult.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
            last_timer_started_at: timerResult.data.last_timer_started_at ?? prev.last_timer_started_at,
            last_timer_stopped_at: timerResult.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
          }));
        }
        setIsPaused(false);
      } else {
        toast.error("Błąd podczas wznawiania timera");
      }
    } catch {
      toast.error("Błąd podczas wznawiania timera");
    }
  }, [sessionId]);

  // Obsługa skip
  const handleSkip = useCallback(async () => {
    // Przy skip, ustawiamy is_skipped: true i możemy mieć puste sets
    const skippedData: ExerciseFormData = {
      actual_count_sets: null,
      actual_sum_reps: null,
      actual_duration_seconds: null,
      actual_rest_seconds: null,
      sets: [], // Skip może być wykonany z pustymi set logs
      is_skipped: true,
    };

    const success = await saveExercise(skippedData, true);
    if (!success) {
      return;
    }

    // Przejście do następnego ćwiczenia
    if (currentExerciseIndex < session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Ostatnie ćwiczenie - zakończ sesję
      try {
        const response = await fetch(
          `/api/workout-sessions/${sessionId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          }
        );

        if (response.ok) {
          toast.success("Sesja treningowa zakończona!");
          router.push(`/workout-sessions/${sessionId}`);
        } else {
          toast.error("Błąd podczas zakończenia sesji");
        }
      } catch {
        toast.error("Błąd podczas zakończenia sesji");
      }
    }
  }, [
    saveExercise,
    currentExerciseIndex,
    session.exercises.length,
    sessionId,
    router,
  ]);

  // Funkcja auto-pauzy (używana przy opuszczeniu strony/route change)
  // Pauzuje zarówno globalny timer jak i timer ćwiczenia
  const autoPause = useCallback(async (saveProgress = false) => {
    // Jeśli już jest w pauzie, nie rób nic
    if (isPaused) {
      return;
    }

    // Opcjonalnie zapisz postępy
    if (saveProgress) {
      try {
        await saveExercise(formData, false);
      } catch (error) {
        console.error("[WorkoutSessionAssistant.autoPause] Error saving progress:", error);
      }
    }

    // Zatrzymaj globalny timer przez API
    const now = new Date().toISOString();
    try {
      const timerResponse = await fetch(
        `/api/workout-sessions/${sessionId}/timer`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            last_timer_stopped_at: now,
          }),
        }
      );

      if (timerResponse.ok) {
        const timerResult = await timerResponse.json();
        // Aktualizuj stan sesji z odpowiedzi API
        if (timerResult.data) {
          setSession((prev) => ({
            ...prev,
            active_duration_seconds: timerResult.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
            last_timer_started_at: timerResult.data.last_timer_started_at ?? prev.last_timer_started_at,
            last_timer_stopped_at: timerResult.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
          }));
        }
        // Pauzuj timer ćwiczenia (ustaw isPaused na true)
        setIsPaused(true);
      }
    } catch (error) {
      console.error("[WorkoutSessionAssistant.autoPause] Error pausing timer:", error);
    }
  }, [isPaused, formData, saveExercise, sessionId]);

  // Funkcja zatrzymująca timer (używana przy wyjściu i unmount)
  // Używamy ref do przechowywania aktualnych wartości, aby uniknąć zależności od session.last_timer_*
  const stopTimer = useCallback(async () => {
    // Użyj ref do sprawdzenia aktualnego stanu bez zależności
    const lastTimerStartedAt = timerStateRef.current.lastTimerStartedAt;
    const lastTimerStoppedAt = timerStateRef.current.lastTimerStoppedAt;
    
    // Zapisujemy czas jeśli timer był uruchomiony (lastTimerStartedAt istnieje)
    // i jeśli timer nie został jeszcze zatrzymany LUB został ponownie uruchomiony po ostatnim zatrzymaniu
    if (!lastTimerStartedAt) {
      return;
    }
    
    // Sprawdź czy timer został już zatrzymany i czy został ponownie uruchomiony
    const isTimerActive = !lastTimerStoppedAt || 
      (lastTimerStoppedAt && new Date(lastTimerStartedAt).getTime() > new Date(lastTimerStoppedAt).getTime());
    
    if (!isTimerActive) {
      return;
    }
    
    const now = new Date().toISOString();
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}/timer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_timer_stopped_at: now,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Aktualizuj stan sesji z odpowiedzi API
        if (result.data) {
          setSession((prev) => ({
            ...prev,
            active_duration_seconds: result.data.active_duration_seconds ?? prev.active_duration_seconds ?? 0,
            last_timer_started_at: result.data.last_timer_started_at ?? prev.last_timer_started_at,
            last_timer_stopped_at: result.data.last_timer_stopped_at ?? prev.last_timer_stopped_at,
          }));
        }
      }
    } catch (error) {
      console.error("[WorkoutSessionAssistant.stopTimer] Error:", error);
    }
  }, [sessionId]);

  // Obsługa wyjścia
  const handleExit = useCallback(async () => {
    try {
      // Automatycznie pauzuj sesję (zapisze postępy i pauzuje timery)
      await autoPause(true);

      // Przekieruj do strony głównej
      router.push("/");
    } catch (error) {
      console.error("[WorkoutSessionAssistant.handleExit] Error:", error);
      // Nawet jeśli wystąpi błąd, przekieruj użytkownika
      router.push("/");
    }
  }, [router, autoPause]);

  // Auto-pauza przy opuszczeniu strony (route change)
  useEffect(() => {
    // Sprawdź, czy jesteśmy na stronie aktywnej sesji
    const activePagePath = `/workout-sessions/${sessionId}/active`;
    const isOnActivePage = pathname === activePagePath;

    // Jeśli nie jesteśmy na stronie aktywnej sesji i sesja nie jest w pauzie, pauzuj
    if (!isOnActivePage && !isPaused) {
      // Sprawdź, czy auto-pauza nie została już wykonana dla tej ścieżki
      if (autoPauseExecutedRef.current !== pathname) {
        autoPauseExecutedRef.current = pathname;
        // Zapisz postępy przed pauzą (gdy użytkownik przechodzi na inną stronę)
        void autoPause(true);
      }
    } else if (isOnActivePage) {
      // Resetuj ref, gdy wracamy na stronę aktywnej sesji
      autoPauseExecutedRef.current = null;
    }
  }, [pathname, sessionId, isPaused, autoPause]);

  // Cleanup przy unmount - pauzuj sesję przy wyjściu z asystenta
  useEffect(() => {
    return () => {
      // Pauzuj sesję przy unmount (wyjście z asystenta)
      // Zapisz postępy - dla route change w Next.js jest czas na async zapis
      void autoPause(true);
    };
  }, [autoPause]);

  // Funkcja do zapisu postępów przy zamknięciu przeglądarki/karty
  // Używa sendBeacon dla niezawodnego zapisu nawet gdy strona się zamyka
  const saveProgressOnUnload = useCallback(() => {
    const currentFormData = formData;
    const currentExerciseOrder = currentExercise.exercise_order;

    // Zapisz postępy przez sendBeacon (działa nawet gdy strona się zamyka)
    // Uwaga: sendBeacon obsługuje tylko GET i POST, więc używamy fetch z keepalive jako alternatywa
    try {
      const command = formDataToAutosaveCommand(currentFormData, false);
      const url = `/api/workout-sessions/${sessionId}/exercises/${currentExerciseOrder}`;
      
      // Używamy fetch z keepalive zamiast sendBeacon, bo endpoint używa PATCH
      fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        keepalive: true, // Ważne: pozwala na wykonanie nawet po zamknięciu strony
      }).catch(() => {
        // Ignoruj błędy - próbujemy zapisać, ale nie blokujemy zamknięcia
      });
    } catch (error) {
      console.error("[WorkoutSessionAssistant.saveProgressOnUnload] Error:", error);
    }

    // Pauzuj timer (użyj fetch z keepalive dla niezawodności)
    const now = new Date().toISOString();
    try {
      fetch(`/api/workout-sessions/${sessionId}/timer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          last_timer_stopped_at: now,
        }),
        keepalive: true, // Ważne: pozwala na wykonanie nawet po zamknięciu strony
      }).catch(() => {
        // Ignoruj błędy - sendBeacon już wysłał dane
      });
    } catch (error) {
      console.error("[WorkoutSessionAssistant.saveProgressOnUnload] Error pausing timer:", error);
    }
  }, [formData, currentExercise.exercise_order, sessionId]);

  // Auto-pauza przy zamknięciu przeglądarki/karty (beforeunload i pagehide)
  useEffect(() => {
    const handleUnload = () => {
      if (!isPaused) {
        saveProgressOnUnload();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [isPaused, saveProgressOnUnload]);

  // Auto-pauza przy wygaszeniu ekranu na mobile (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Gdy strona staje się niewidoczna (wygaszenie ekranu, przełączenie aplikacji, itp.)
      if (document.visibilityState === "hidden" && !isPaused) {
        // Zapisz postępy i pauzuj sesję
        // Dla visibilitychange używamy normalnego async zapisu (jest czas)
        void autoPause(true);
      }
    };

    // visibilitychange - działa na mobile gdy ekran się wygasi lub przełączenie aplikacji
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused, autoPause]);

  // Funkcja pomocnicza do upewnienia się, że formularz ma serię dla danego numeru
  // (używana przez updateSetInForm, więc nie jest już potrzebna jako osobna funkcja)

  // Funkcja aktualizująca serię w formularzu na podstawie numeru serii
  const updateSetInForm = useCallback(
    (setNumber: number, updates: Partial<SetLogFormData>) => {
      setFormData((prev) => {
        const setIndex = prev.sets.findIndex((set) => set.set_number === setNumber);
        
        if (setIndex === -1) {
          // Jeśli seria nie istnieje, dodaj ją
          const newSet: SetLogFormData = {
            set_number: setNumber,
            reps: currentExercise.planned_reps ?? null,
            duration_seconds: currentExercise.planned_duration_seconds ?? null,
            weight_kg: null,
            ...updates,
          };
          const newSets = [...prev.sets, newSet].sort(
            (a, b) => a.set_number - b.set_number
          );
          return { ...prev, sets: newSets };
        }

        // Aktualizuj istniejącą serię
        const newSets = [...prev.sets];
        newSets[setIndex] = { ...newSets[setIndex], ...updates };
        return { ...prev, sets: newSets };
      });
    },
    [currentExercise.planned_reps, currentExercise.planned_duration_seconds]
  );

  // Callback: zakończenie serii (odliczanie czasu lub powtórzenia)
  // Timer automatycznie przejdzie do odpowiedniej przerwy w komponencie ExerciseTimer
  const handleSetComplete = useCallback(() => {
    // Jeśli to ćwiczenie z czasem, aktualizuj duration_seconds w formularzu
    if (
      currentExercise.planned_duration_seconds &&
      currentExercise.planned_duration_seconds > 0
    ) {
      updateSetInForm(currentSetNumber, {
        duration_seconds: currentExercise.planned_duration_seconds,
      });
    }
  }, [currentSetNumber, currentExercise.planned_duration_seconds, updateSetInForm]);

  // Callback: zakończenie przerwy między seriami
  const handleRestBetweenComplete = useCallback(() => {
    const nextSetNumber = currentSetNumber + 1;
    const plannedSets = currentExercise.planned_sets ?? 1;

    if (nextSetNumber <= plannedSets) {
      setCurrentSetNumber(nextSetNumber);
      // Upewnij się, że formularz ma serię dla następnego numeru
      updateSetInForm(nextSetNumber, {});
    }
  }, [currentSetNumber, currentExercise.planned_sets, updateSetInForm]);

  // Callback: zakończenie przerwy po seriach
  const handleRestAfterSeriesComplete = useCallback(() => {
    // Zapisz ćwiczenie i przejdź do następnego
    void handleNext();
  }, [handleNext]);

  // Callback: zakończenie powtórzeń (kliknięcie OK)
  const handleRepsComplete = useCallback(() => {
    // Jeśli to ćwiczenie z powtórzeniami, aktualizuj reps w formularzu
    if (currentExercise.planned_reps && currentExercise.planned_reps > 0) {
      updateSetInForm(currentSetNumber, {
        reps: currentExercise.planned_reps,
      });
    }
  }, [currentSetNumber, currentExercise.planned_reps, updateSetInForm]);

  // Obliczanie czy można przejść dalej
  const canGoNext = useMemo(() => {
    // Jeśli ćwiczenie jest pominięte, zawsze można przejść dalej
    if (formData.is_skipped) return true;

    // Jeśli nie ma serii, nie można przejść dalej (chyba że skip)
    if (formData.sets.length === 0) return false;

    // Walidacja: wszystkie serie muszą mieć co najmniej jedną metrykę
    const errors = validateForm(formData);
    return Object.keys(errors).length === 0;
  }, [formData, validateForm]);

  const canGoPrevious = currentExerciseIndex > 0;

  // Renderowanie timera ćwiczenia jako prop do WorkoutTimer
  const exerciseTimerContent = useMemo(
    () => (
      <ExerciseTimer
        exercise={currentExercise}
        currentSetNumber={currentSetNumber}
        isPaused={isPaused}
        onSetComplete={handleSetComplete}
        onRestBetweenComplete={handleRestBetweenComplete}
        onRestAfterSeriesComplete={handleRestAfterSeriesComplete}
        onRepsComplete={handleRepsComplete}
      />
    ),
    [
      currentExercise,
      currentSetNumber,
      isPaused,
      handleSetComplete,
      handleRestBetweenComplete,
      handleRestAfterSeriesComplete,
      handleRepsComplete,
    ]
  );

  if (!currentExercise) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-16 md:bottom-0 flex items-center justify-center bg-secondary">
        <p className="text-lg">Brak ćwiczeń w sesji</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 md:bottom-0 flex flex-col bg-secondary overflow-hidden">
      {/* Exit button */}
      <ExitSessionButton onExit={handleExit} />

      {/* Autosave indicator */}
      <AutosaveIndicator status={autosaveStatus} errorMessage={autosaveError} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto md:pt-16">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
          {/* Timer globalny sesji z timerem ćwiczenia */}
          <WorkoutTimer
            activeDurationSeconds={session.active_duration_seconds ?? 0}
            lastTimerStartedAt={session.last_timer_started_at ?? null}
            lastTimerStoppedAt={session.last_timer_stopped_at ?? null}
            isPaused={isPaused}
            currentExerciseName={currentExercise.exercise_title_at_time}
            currentSetNumber={currentSetNumber}
            currentExerciseIndex={currentExerciseIndex}
            totalExercises={session.exercises.length}
            exerciseTimerContent={exerciseTimerContent}
            onTimerStop={stopTimer}
          />

          {/* Exercise info */}
          <CurrentExerciseInfo exercise={currentExercise} />

          {/* Exercise form */}
          <ExerciseExecutionForm
            exercise={currentExercise}
            onChange={setFormData}
            errors={formErrors}
          />
        </div>
      </div>

      {/* Navigation buttons - fixed at bottom */}
      <div className="border-t border-border bg-white p-4 dark:border-border dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <NavigationButtons
            onPrevious={handlePrevious}
            onPause={handlePause}
            onResume={handleResume}
            onSkip={handleSkip}
            onNext={handleNext}
            isPaused={isPaused}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isLoading={autosaveStatus === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
