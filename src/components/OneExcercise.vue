<script setup>
import workoutList from "@/workouts.json";
import { defineProps, ref } from "vue";

defineProps({
  exc: Object,
});

// const showFullDescription = ref(false);
</script>

<template>
  <div
    class="bg-goLightPink rounded-xl shadow-md relative p-4 flex flex-col justify-between h-[350px]"
  >
    <div class="flex-grow">
      <div class="mb-3">
        <div class="text-gray-500 my-2">{{ exc.title }}</div>
        <h3 class="text-xl font-bold">{{ exc.title }}</h3>
      </div>

      <div class="mb-2">
        <p>{{ exc.description }}</p>
      </div>

      <p>{{ exc.details }}</p>
      <div class="text-goDarkPink my-3">
        <h3>Reps: {{ exc.reps }}</h3>
        <h3>Duration: {{ exc.duration }}</h3>

        <h3 v-if="exc.sides !== 'no'" class="text-goDarkPink mb-2">
          Sides: {{ exc.sides }}
        </h3>
      </div>
    </div>

    <div class="border border-gray-100 my-2"></div>

    <div class="flex flex-col lg:flex-row justify-between">
      <div class="text-goRed mb-3">
        <i class="fa-solid fa-location-dot text-lg"></i>
        Series: {{ exc.series }}
      </div>

      <a
        href="#"
        class="h-[36px] bg-goDarkPink hover:bg-goRed text-white px-4 py-2 rounded-lg text-center text-sm"
      >
        Details
      </a>
    </div>
  </div>
</template>
