<script setup>
import { RouterLink } from "vue-router";
</script>
<template>
  <div class="py-6 flex justify-center">
    <RouterLink
      to="/workouts/add"
      class="inline-block bg-goMidRed text-white rounded-lg px-4 py-2 hover:bg-goRed"
    >
      Add workout
    </RouterLink>
  </div>
</template>
