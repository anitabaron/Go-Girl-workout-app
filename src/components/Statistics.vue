<script setup>
import { computed } from "vue";

const stats = [
  {
    date: "2025-02-03",
    exercises: {
      "Pull-ups": [6, 5, 3, 3],
      "Push-ups": [15, 12, 10, 8],
      Squats: [20, 20, 18, 15],
      Dips: [10, 8, 6, 5],
      "Plank Hold": [45, 45, 40],
    },
  },
  {
    date: "2025-02-07",
    exercises: {
      "Pull-ups": [7, 6, 5, 4],
      "Push-ups": [18, 15, 12, 10],
      Squats: [22, 22, 20, 18],
      Dips: [12, 10, 8, 6],
      "Plank Hold": [50, 45, 45],
    },
  },
  {
    date: "2025-02-10",
    exercises: {
      "Pull-ups": [5, 4, 4, 3],
      "Push-ups": [20, 18, 15, 12],
      Squats: [25, 22, 20, 20],
      Dips: [14, 12, 10, 8],
      "Plank Hold": [55, 50, 45],
    },
  },
];

// Compute personal records (highest total)
const personalRecords = computed(() => {
  const pr = {};
  stats.forEach((session) => {
    for (const [exercise, reps] of Object.entries(session.exercises)) {
      const total = reps.reduce((a, b) => a + b, 0);
      if (!pr[exercise] || total > pr[exercise]) {
        pr[exercise] = total;
      }
    }
  });
  return pr;
});

// Check if reps are lower than the previous session
const isWorse = (index, reps, name) => {
  if (index === 0) return false;
  const prev = stats[index - 1].exercises[name];
  if (!prev) return false;
  const currTotal = reps.reduce((a, b) => a + b, 0);
  const prevTotal = prev.reduce((a, b) => a + b, 0);
  return currTotal < prevTotal;
};

// Check if this is a personal record
const isPR = (reps, name) => {
  const total = reps.reduce((a, b) => a + b, 0);
  return total === personalRecords.value[name];
};
</script>

<template>
  <div class="p-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    <div
      v-for="(session, index) in stats"
      :key="index"
      class="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition"
    >
      <h2 class="text-xl font-bold mb-4 text-gray-800">
        Workout - {{ session.date }}
      </h2>
      <table class="w-full text-sm text-left text-gray-700">
        <thead>
          <tr class="border-b border-gray-300">
            <th class="py-1 pr-4 font-semibold">Exercise</th>
            <th class="py-1 font-semibold">Reps/Time</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(reps, name) in session.exercises"
            :key="name"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="py-1 pr-4">{{ name }}</td>
            <td class="py-1">
              <span
                :class="[
                  isWorse(index, reps, name) ? ' text-orange-500' : '',
                  isPR(reps, name) ? 'font-bold text-goDarkPink' : '',
                ]"
              >
                {{ reps.join(" / ") }}
              </span>

              <span
                v-if="isPR(reps, name)"
                class="ml-2 text-xs text-white bg-goDarkPink px-2 py-0.5 rounded-full"
              >
                PR
              </span>

              <span
                v-if="name === 'Plank Hold'"
                class="text-xs text-gray-400 ml-1"
              >
                sec
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
