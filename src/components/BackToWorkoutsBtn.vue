<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
  <section>
    <div class="container m-auto py-2 px-2">
      <RouterLink
        to="/workouts"
        class="text-goRed hover:text-goMidRed flex items-center"
      >
        <i class="pi pi-arrow-circle-left mr-3"></i> Back to Workouts List
      </RouterLink>
    </div>
  </section>
</template>
