interface Exercise {
  name: string;
  type: "time" | "reps";
  durationOrReps: number; // Czas w sekundach lub liczba powtórzeń
  restTime: number;
}

//np.

const plank: Exercise = {
  name: "Plank",
  type: "time",
  durationOrReps: 60, // 60 sekund
  restTime: 30,
};

const squats: Exercise = {
  name: "Squats",
  type: "reps",
  durationOrReps: 15, // 15 powtórzeń
  restTime: 20,
};
