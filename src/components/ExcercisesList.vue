<script setup>
import workoutList from "@/workouts.json";

import { ref, defineProps } from "vue";
import OneExcercise from "./OneExcercise.vue";
const workouts = ref(workoutList);
// console.log(workouts.value);

defineProps({
  limit: Number,
  showButton: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <section class="bg-goPink py-10">
    <section class="px-4">
      <div class="container-xl lg:container m-auto">
        <h2 class="text-3xl font-bold text-black pb-6 text-center">
          Browse exercise
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OneExcercise
            v-for="workout in workouts.slice(0, limit || workouts.length)"
            :key="workout.id"
            :exc="workout"
          />
        </div>
      </div>
    </section>
    <section v-if="showButton" class="m-auto max-w-lg mt-5 px-6">
      <a
        href="/excercises"
        class="block bg-goRed text-white text-center py-4 px-6 rounded-xl hover:bg-gray-700"
        >View All Excercises</a
      >
    </section>
  </section>
</template>
