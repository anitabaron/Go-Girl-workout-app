<script setup>
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
</script>
<template>
  {{ stats }}
</template>
