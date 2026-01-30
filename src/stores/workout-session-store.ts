import { create } from "zustand";
import type { SessionDetailDTO } from "@/types";
import {
  type ExerciseFormData,
  type FormErrors,
  type AutosaveStatus,
  exerciseToFormData,
} from "@/types/workout-session-assistant";

interface WorkoutSessionStore {
  sessionId: string | null;
  session: SessionDetailDTO | null;
  currentExerciseIndex: number;
  isPaused: boolean;
  formData: ExerciseFormData | null;
  formErrors: FormErrors;
  autosaveStatus: AutosaveStatus;
  autosaveError: string | undefined;
  currentSetNumber: number;

  setSession: (
    session: SessionDetailDTO | ((prev: SessionDetailDTO) => SessionDetailDTO),
  ) => void;
  setCurrentExerciseIndex: (index: number) => void;
  setIsPaused: (paused: boolean) => void;
  setFormData: (
    data: ExerciseFormData | ((prev: ExerciseFormData) => ExerciseFormData),
  ) => void;
  setFormErrors: (errors: FormErrors) => void;
  setAutosaveStatus: (status: AutosaveStatus) => void;
  setAutosaveError: (error: string | undefined) => void;
  setCurrentSetNumber: (number: number) => void;

  resetStore: (sessionId: string, initialSession: SessionDetailDTO) => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionStore>((set) => ({
  sessionId: null,
  session: null,
  currentExerciseIndex: 0,
  isPaused: false,
  formData: null,
  formErrors: {},
  autosaveStatus: "idle",
  autosaveError: undefined,
  currentSetNumber: 1,

  setSession: (session) =>
    set((state) => {
      let newSession: SessionDetailDTO | null;
      if (typeof session === "function" && state.session) {
        newSession = session(state.session);
      } else if (typeof session === "function") {
        newSession = state.session;
      } else {
        newSession = session;
      }
      return { session: newSession };
    }),

  setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),

  setIsPaused: (paused) => set({ isPaused: paused }),

  setFormData: (data) =>
    set((state) => {
      const newFormData =
        typeof data === "function"
          ? (data as (prev: ExerciseFormData | null) => ExerciseFormData)(
              state.formData,
            )
          : data;
      return { formData: newFormData };
    }),

  setFormErrors: (errors) => set({ formErrors: errors }),

  setAutosaveStatus: (status) => set({ autosaveStatus: status }),

  setAutosaveError: (error) => set({ autosaveError: error }),

  setCurrentSetNumber: (number) => set({ currentSetNumber: number }),

  resetStore: (sessionId, initialSession) => {
    const position = initialSession.current_position ?? 0;
    const currentExerciseIndex =
      position > 0
        ? Math.min(position - 1, initialSession.exercises.length - 1)
        : 0;
    const firstExercise =
      initialSession.exercises[currentExerciseIndex] ??
      initialSession.exercises[0];
    const formData = firstExercise ? exerciseToFormData(firstExercise) : null;

    set({
      sessionId,
      session: initialSession,
      currentExerciseIndex,
      isPaused: false,
      formData,
      formErrors: {},
      autosaveStatus: "idle",
      autosaveError: undefined,
      currentSetNumber: 1,
    });
  },
}));
