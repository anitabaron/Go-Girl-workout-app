<script setup>
import { RouterLink } from "vue-router";
</script>
<template>
  <div class="py-6 flex justify-center gap-6">
    <RouterLink
      to="/workouts/someId"
      class="inline-block bg-goMidRed text-white rounded-lg px-4 py-2 hover:bg-goRed"
    >
      Pick workout
    </RouterLink>
    <RouterLink
      to="/workouts/someId"
      class="inline-block bg-goMidRed text-white rounded-lg px-4 py-2 hover:bg-goRed"
    >
      Random workout
    </RouterLink>
    <RouterLink
      to="/workouts/add"
      class="inline-block bg-goMidRed text-white rounded-lg px-4 py-2 hover:bg-goRed"
    >
      Add workout
    </RouterLink>
  </div>
</template>
