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
  const initialFormDataValue = useMemo(() => 
    exerciseToFormData(
      session.exercises[currentExerciseIndex] || session.exercises[0]
    ),
    [session.exercises, currentExerciseIndex]
  );
  
  const [formData, setFormDataState] = useState<ExerciseFormData>(initialFormDataValue);
  
  // Ref do przechowywania aktualnego stanu formularza (używane w handleNext, aby uniknąć problemów z closure)
  const formDataRef = useRef<ExerciseFormData>(initialFormDataValue);
  
  // Wrapper dla setFormData, który aktualizuje również ref
  const setFormData = useCallback((updater: ExerciseFormData | ((prev: ExerciseFormData) => ExerciseFormData)) => {
    setFormDataState((prev) => {
      const newFormData = typeof updater === 'function' ? updater(prev) : updater;
      formDataRef.current = newFormData; // Aktualizuj ref
      return newFormData;
    });
  }, []);
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
  
  // Ref do przechowywania aktualnego statusu sesji (używane w stopTimer, aby uniknąć zależności od closure)
  const sessionStatusRef = useRef(initialSession.status);
  
  // Ref do śledzenia poprzedniego sessionId (do resetowania przy zmianie sesji)
  const previousSessionIdRef = useRef<string>(sessionId);
  
  // Ref do śledzenia, czy auto-pauza została już wykonana dla bieżącej ścieżki
  const autoPauseExecutedRef = useRef<string | null>(null);
  
  // Ref do śledzenia poprzedniego pathname (używane do wykrywania faktycznej zmiany route)
  const previousPathnameRef = useRef<string | null>(null);
  
  // Ref do śledzenia, czy komponent został już zamontowany (zapobiega auto-pauzie przy pierwszym renderze)
  const isMountedRef = useRef(false);
  
  // Ref do śledzenia, czy to pierwszy render (zapobiega auto-pauzie przy inicjalizacji)
  const isFirstRenderRef = useRef(true);
  
  // Ref do śledzenia ostatniego czasu gdy strona była widoczna (zapobiega fałszywym alarmom visibilitychange)
  const lastVisibleTimeRef = useRef<number>(Date.now());
  
  // Ref do śledzenia, czy jesteśmy w trakcie automatycznego przejścia do następnego ćwiczenia
  // (zapobiega pauzowaniu podczas auto-transitions między ćwiczeniami)
  const isAutoTransitioningRef = useRef<boolean>(false);
  
  // Ref do przechowywania aktualnej funkcji autoPause (używane w cleanup, aby uniknąć zależności)
  const autoPauseRef = useRef<((saveProgress?: boolean) => Promise<void>) | null>(null);
  
  // Resetuj refy i aktualizuj stan przy zmianie sessionId (nowa sesja)
  useEffect(() => {
    // Jeśli sessionId się zmienił, resetuj wszystko dla nowej sesji
    if (previousSessionIdRef.current !== sessionId) {
      previousSessionIdRef.current = sessionId;
      timerInitializedRef.current = false; // Resetuj flagę inicjalizacji
      isMountedRef.current = false; // Resetuj flagę zamontowania dla nowej sesji
      isFirstRenderRef.current = true; // Resetuj flagę pierwszego renderu dla nowej sesji
      
      // Zaktualizuj stan sesji na podstawie nowego initialSession
      setSession(initialSession);
      
      // Zaktualizuj refy timera i statusu sesji
      timerStateRef.current = {
        lastTimerStartedAt: initialSession.last_timer_started_at,
        lastTimerStoppedAt: initialSession.last_timer_stopped_at,
      };
      sessionStatusRef.current = initialSession.status;
    }
  }, [sessionId, initialSession]);
  
  // Aktualizuj ref przy zmianie stanu sesji (dla bieżącej sesji)
  useEffect(() => {
    timerStateRef.current = {
      lastTimerStartedAt: session.last_timer_started_at,
      lastTimerStoppedAt: session.last_timer_stopped_at,
    };
    sessionStatusRef.current = session.status;
  }, [session.last_timer_started_at, session.last_timer_stopped_at, session.status]);

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
    // Jeśli timer został już zainicjalizowany dla tej sesji, oznacz jako zamontowany i zakończ
    if (timerInitializedRef.current) {
      isMountedRef.current = true;
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
          // Oznacz komponent jako zamontowany dopiero po pomyślnym uruchomieniu timera
          isMountedRef.current = true;
          // Oznacz, że pierwszy render się zakończył
          isFirstRenderRef.current = false;
        })
        .catch(() => {
          timerInitializedRef.current = false; // W przypadku błędu, pozwól na ponowną próbę
          // Nie ustawiaj isMountedRef na true w przypadku błędu
        });
    } else {
      // Timer jest już uruchomiony, oznacz jako zainicjalizowany i zamontowany
      timerInitializedRef.current = true;
      isMountedRef.current = true;
      // Oznacz, że pierwszy render się zakończył
      isFirstRenderRef.current = false;
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
      setFormData(newFormData); // setFormData już aktualizuje ref
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise]); // setFormData jest stabilne (useCallback), nie potrzebuje być w zależnościach
  
  // Ref jest aktualizowany w setFormData i updateSetInForm, więc nie potrzebujemy osobnego useEffect

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
          let errorData: { message?: string; details?: string; code?: string } = {};
          try {
            const text = await response.text();
            if (text) {
              errorData = JSON.parse(text);
            }
          } catch {
            // Jeśli nie można sparsować JSON, użyj pustego obiektu
          }
          throw new Error(errorData.message || `Błąd zapisu ćwiczenia (${response.status})`);
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
    // Użyj aktualnego stanu formularza z ref (aby uniknąć problemów z closure)
    const currentFormData = formDataRef.current;
    
    // Walidacja przed zapisem
    const errors = validateForm(currentFormData);
    if (Object.keys(errors).length > 0 && !currentFormData.is_skipped) {
      setFormErrors(errors);
      toast.error("Popraw błędy w formularzu przed zapisem");
      return;
    }

    // Zapisz i przejdź dalej
    const success = await saveExercise(currentFormData, true);
    if (!success) {
      return;
    }

    // WAŻNE: Dodaj małe opóźnienie przed zmianą statusu, aby upewnić się że set logs są zapisane w bazie
    // To zapobiega race condition gdzie status zmienia się przed zakończeniem transakcji DB
    if (currentExerciseIndex === session.exercises.length - 1) {
      // Ostatnie ćwiczenie - poczekaj chwilę przed zakończeniem sesji
      await new Promise((resolve) => setTimeout(resolve, 500));
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
          const result = await response.json();
          // Aktualizuj lokalny stan sesji - zmień status na 'completed'
          // To zapobiega próbom zapisania podczas cleanup, gdy sesja już nie jest 'in_progress'
          setSession((prev) => ({
            ...prev,
            status: "completed" as const,
            completed_at: result.data?.completed_at ?? prev.completed_at,
          }));
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
    // Użyj aktualnego stanu formularza z ref
    const currentFormData = formDataRef.current;
    // Zapisz stan bez przesuwania kursora
    await saveExercise(currentFormData, false);

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
  }, [saveExercise, sessionId]);

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
          const result = await response.json();
          // Aktualizuj lokalny stan sesji - zmień status na 'completed'
          // To zapobiega próbom zapisania podczas cleanup, gdy sesja już nie jest 'in_progress'
          setSession((prev) => ({
            ...prev,
            status: "completed" as const,
            completed_at: result.data?.completed_at ?? prev.completed_at,
          }));
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

  // Funkcja do oznaczania automatycznego przejścia do następnego ćwiczenia
  // Używana podczas automatycznego przejścia po zakończeniu wszystkich serii ćwiczenia
  // Zapobiega pauzowaniu treningu przez visibilitychange podczas przejścia
  const markAutoTransition = useCallback(() => {
    // Oznacz, że jesteśmy w trakcie automatycznego przejścia do następnego ćwiczenia
    isAutoTransitioningRef.current = true;
    
    // Resetuj flagę po opóźnieniu (daje czas na zakończenie eventów visibilitychange)
    // Używamy 2 sekund aby pokryć cały okres przejścia między ćwiczeniami
    setTimeout(() => {
      isAutoTransitioningRef.current = false;
    }, 2000);
  }, []);

  // Funkcja auto-pauzy (używana przy opuszczeniu strony/route change)
  // Pauzuje zarówno globalny timer jak i timer ćwiczenia
  const autoPause = useCallback(async (saveProgress = false) => {
    // Jeśli to pierwszy render, nie wykonuj auto-pauzy
    if (isFirstRenderRef.current) {
      return;
    }
    
    // Jeśli komponent nie został jeszcze zamontowany, nie wykonuj auto-pauzy
    // (zapobiega auto-pauzie przy pierwszym renderze)
    if (!isMountedRef.current) {
      return;
    }
    
    // Jeśli sesja nie jest w statusie 'in_progress', nie wykonuj auto-pauzy
    // (sesja może być już zakończona, np. po zakończeniu ostatniego ćwiczenia)
    if (session.status !== 'in_progress') {
      return;
    }
    
    // Jeśli już jest w pauzie, nie rób nic
    if (isPaused) {
      return;
    }
    
    // Jeśli timer nie został jeszcze zainicjalizowany, nie wykonuj auto-pauzy
    // (zapobiega auto-pauzie przed uruchomieniem timera)
    if (!timerInitializedRef.current) {
      return;
    }

    // Jeśli jesteśmy w trakcie automatycznego przejścia do następnego ćwiczenia,
    // nie pauzuj (tylko zapisz jeśli trzeba)
    // To zapobiega pauzowaniu podczas automatycznych przejść między ćwiczeniami
    if (isAutoTransitioningRef.current) {
      if (saveProgress && session.status === 'in_progress') {
        try {
          // Użyj aktualnego stanu formularza z ref
          const currentFormData = formDataRef.current;
          await saveExercise(currentFormData, false);
        } catch (error) {
          // Jeśli błąd 409 (sesja nie jest in_progress), to jest oczekiwane
          // gdy trening został zakończony przed unmount - nie logujemy jako błąd
          if (!(error instanceof Error && error.message.includes("nie jest w statusie 'in_progress'"))) {
            console.error("[WorkoutSessionAssistant.autoPause] Error saving progress during auto-transition:", error);
          }
        }
      }
      return; // Nie pauzuj podczas automatycznych przejść między ćwiczeniami
    }

    // Opcjonalnie zapisz postępy
    if (saveProgress) {
      try {
        // Użyj aktualnego stanu formularza z ref
        const currentFormData = formDataRef.current;
        await saveExercise(currentFormData, false);
      } catch (error) {
        // Jeśli błąd 409 (sesja nie jest in_progress), to jest oczekiwane
        // gdy trening został zakończony przed unmount - nie logujemy jako błąd
        if (!(error instanceof Error && error.message.includes("nie jest w statusie 'in_progress'"))) {
          console.error("[WorkoutSessionAssistant.autoPause] Error saving progress:", error);
        }
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
  }, [isPaused, saveExercise, sessionId, session.status]);
  
  // Aktualizuj ref przy każdej zmianie autoPause
  useEffect(() => {
    autoPauseRef.current = autoPause;
  }, [autoPause]);

  // Funkcja zatrzymująca timer (używana przy wyjściu i unmount)
  // Używamy ref do przechowywania aktualnych wartości, aby uniknąć zależności od session.last_timer_*
  const stopTimer = useCallback(async () => {
    // Jeśli sesja nie jest w statusie 'in_progress', nie próbuj zatrzymywać timera
    // (sesja może być już zakończona, np. po zakończeniu ostatniego ćwiczenia)
    // Używamy ref, aby mieć aktualny status nawet gdy closure ma stary status
    if (sessionStatusRef.current !== 'in_progress') {
      return;
    }
    
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
      } else if (response.status === 409) {
        // Sesja nie jest już w statusie 'in_progress' (np. została zakończona)
        // To jest oczekiwane, gdy trening został zakończony przed unmount
        // Nie logujemy jako błąd, bo to normalna sytuacja
      }
    } catch {
      // Ignoruj błędy - próbujemy zatrzymać timer, ale nie blokujemy unmount
    }
  }, [sessionId]);

  // Obsługa wyjścia
  const handleExit = useCallback(async () => {
    try {
      // Automatycznie pauzuj sesję (zapisze postępy i pauzuje timery)
      await autoPause(true);

      // Przekieruj do strony głównej
      router.push("/");
    } catch {
      // Nawet jeśli wystąpi błąd, przekieruj użytkownika
      router.push("/");
    }
  }, [router, autoPause]);

  // Auto-pauza przy opuszczeniu strony (route change)
  useEffect(() => {
    // Jeśli komponent nie został jeszcze zamontowany, nie wykonuj auto-pauzy
    if (!isMountedRef.current) {
      return;
    }
    
    // Jeśli timer nie został jeszcze zainicjalizowany, nie wykonuj auto-pauzy
    if (!timerInitializedRef.current) {
      return;
    }
    
    // Jeśli to pierwszy render, nie wykonuj auto-pauzy
    if (isFirstRenderRef.current) {
      return;
    }
    
    // Sprawdź, czy jesteśmy na stronie aktywnej sesji
    const activePagePath = `/workout-sessions/${sessionId}/active`;
    const isOnActivePage = pathname === activePagePath;
    
    // Sprawdź, czy pathname faktycznie się zmienił (aby uniknąć fałszywych logów)
    const pathnameChanged = previousPathnameRef.current !== pathname;
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    // Jeśli nie jesteśmy na stronie aktywnej sesji i sesja nie jest w pauzie, pauzuj
    // Ważne: sprawdzamy czy pathname istnieje i czy nie jesteśmy na właściwej stronie
    // Dodatkowo sprawdzamy czy pathname faktycznie się zmienił (nie jest pusty lub undefined)
    if (!isOnActivePage && !isPaused && pathname && pathname !== activePagePath && pathname.trim() !== "") {
      // Sprawdź, czy auto-pauza nie została już wykonana dla tej ścieżki
      if (autoPauseExecutedRef.current !== pathname) {
        autoPauseExecutedRef.current = pathname;
        // Zapisz postępy przed pauzą (gdy użytkownik przechodzi na inną stronę)
        void autoPause(true);
      }
    } else if (isOnActivePage && pathnameChanged && previousPathname !== activePagePath) {
      // Resetuj ref, gdy faktycznie wracamy na stronę aktywnej sesji (tylko gdy pathname się zmienił z innej strony)
      autoPauseExecutedRef.current = null;
    }
  }, [pathname, sessionId, isPaused, autoPause]);

  // Cleanup przy unmount - pauzuj sesję przy wyjściu z asystenta
  // Używamy pustej tablicy zależności, aby cleanup był wywoływany TYLKO przy faktycznym unmount
  // autoPause jest przechowywane w ref, aby mieć dostęp do najnowszej wersji funkcji
  useEffect(() => {
    return () => {
      // Pauzuj sesję przy unmount (wyjście z asystenta)
      // Zapisz postępy - dla route change w Next.js jest czas na async zapis
      // Używamy ref, aby uniknąć wywoływania cleanup przy każdej zmianie zależności
      if (autoPauseRef.current) {
        void autoPauseRef.current(true);
      }
    };
     
  }, []); // Pusta tablica - cleanup tylko przy unmount

  // Funkcja do zapisu postępów przy zamknięciu przeglądarki/karty
  // Używa sendBeacon dla niezawodnego zapisu nawet gdy strona się zamyka
  const saveProgressOnUnload = useCallback(() => {
    // Użyj aktualnego stanu formularza z ref
    const currentFormData = formDataRef.current;
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
    } catch {
      // Ignoruj błędy - próbujemy zapisać, ale nie blokujemy zamknięcia
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
    } catch {
      // Ignoruj błędy - próbujemy zapisać, ale nie blokujemy zamknięcia
    }
  }, [currentExercise.exercise_order, sessionId]);

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
      // Jeśli komponent nie został jeszcze zamontowany, nie wykonuj auto-pauzy
      if (!isMountedRef.current) {
        return;
      }
      
      // Aktualizuj czas ostatniej widoczności
      if (document.visibilityState === "visible") {
        lastVisibleTimeRef.current = Date.now();
        return;
      }
      
      // Gdy strona staje się niewidoczna (wygaszenie ekranu, przełączenie aplikacji, itp.)
      if (document.visibilityState === "hidden" && !isPaused) {
        // Sprawdź, czy strona była widoczna przez co najmniej 1 sekundę przed ukryciem
        // To zapobiega fałszywym alarmom podczas interakcji użytkownika (np. kliknięcie OK)
        const timeSinceLastVisible = Date.now() - lastVisibleTimeRef.current;
        const MIN_VISIBLE_TIME = 1000; // 1 sekunda
        
        if (timeSinceLastVisible < MIN_VISIBLE_TIME) {
          // Zbyt szybka zmiana - prawdopodobnie fałszywy alarm, ignoruj
          return;
        }
        
        // Zapisz postępy i pauzuj sesję
        // Dla visibilitychange używamy normalnego async zapisu (jest czas)
        void autoPause(true);
      }
    };

    // visibilitychange - działa na mobile gdy ekran się wygasi lub przełączenie aplikacji
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Inicjalizuj czas ostatniej widoczności
    if (document.visibilityState === "visible") {
      lastVisibleTimeRef.current = Date.now();
    }

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
        
        let newFormData: ExerciseFormData;
        
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
          newFormData = { ...prev, sets: newSets };
        } else {
          // Aktualizuj istniejącą serię
          const newSets = [...prev.sets];
          newSets[setIndex] = { ...newSets[setIndex], ...updates };
          newFormData = { ...prev, sets: newSets };
        }
        
        // Ref jest aktualizowany w setFormData, więc nie musimy go tutaj aktualizować
        return newFormData;
      });
    },
    [currentExercise.planned_reps, currentExercise.planned_duration_seconds, setFormData]
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
    // Nie zapisujemy po każdej serii - tylko po zakończeniu wszystkich serii ćwiczenia
  }, [currentSetNumber, currentExercise.planned_duration_seconds, currentExercise.exercise_order, updateSetInForm]);

  // Callback: zakończenie przerwy między seriami
  const handleRestBetweenComplete = useCallback(() => {
    const nextSetNumber = currentSetNumber + 1;
    const plannedSets = currentExercise.planned_sets ?? 1;

    if (nextSetNumber <= plannedSets) {
      setCurrentSetNumber(nextSetNumber);
      // Upewnij się, że formularz ma serię dla następnego numeru
      updateSetInForm(nextSetNumber, {});
    }
    // Nie zapisujemy między seriami - tylko po zakończeniu wszystkich serii ćwiczenia
  }, [currentSetNumber, currentExercise.planned_sets, currentExercise.exercise_order, updateSetInForm]);

  // Callback: zakończenie przerwy po seriach
  // To jest moment gdy wszystkie serie ćwiczenia są zakończone i przechodzimy do następnego ćwiczenia
  const handleRestAfterSeriesComplete = useCallback(() => {
    // Oznacz, że jesteśmy w trakcie automatycznego przejścia do następnego ćwiczenia
    // To zapobiega pauzowaniu przez visibilitychange podczas przejścia
    markAutoTransition();
    
    // Zapisz ćwiczenie i przejdź do następnego
    // handleNext zapisuje ćwiczenie i przechodzi do następnego ćwiczenia
    // Ref jest aktualizowany bezpośrednio w updateSetInForm, więc możemy wywołać handleNext natychmiast
    void handleNext();
  }, [handleNext, markAutoTransition]);

  // Callback: zakończenie powtórzeń (kliknięcie OK)
  const handleRepsComplete = useCallback(() => {
    // Jeśli to ćwiczenie z powtórzeniami, aktualizuj reps w formularzu
    if (currentExercise.planned_reps && currentExercise.planned_reps > 0) {
      updateSetInForm(currentSetNumber, {
        reps: currentExercise.planned_reps,
      });
    }
    // Nie zapisujemy po powtórzeniach - tylko po zakończeniu wszystkich serii ćwiczenia
  }, [currentSetNumber, currentExercise.planned_reps, currentExercise.exercise_order, updateSetInForm]);

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
