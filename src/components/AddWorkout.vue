<script setup>
import { RouterLink } from "vue-router";
</script>
<template>
  <div>
    <RouterLink
      to="/workouts/add"
      class="inline-block bg-black text-white rounded-lg px-4 py-2 hover:bg-goRed"
    >
      Add workout
    </RouterLink>
  </div>
</template>
