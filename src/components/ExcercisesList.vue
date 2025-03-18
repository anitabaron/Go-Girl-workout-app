<script setup>
import workoutList from "@/workouts.json";

import { ref } from "vue";
import OneExcercise from "./OneExcercise.vue";
const workouts = ref(workoutList);
// console.log(workouts.value);
</script>

<template>
  <section class="bg-goPink px-4 py10">
    <div class="container-xl lg:container m-auto">
      <h2 class="text-3xl font-bold text-black p-6 text-center">
        Browse exercise
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OneExcercise
          v-for="workout in workouts"
          :key="workout.id"
          :exc="workout"
        />
      </div>
    </div>
  </section>
</template>
