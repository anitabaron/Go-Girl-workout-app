<script setup>
import { RouterLink } from "vue-router";
import { reactive, onMounted } from "vue";
import OneExercise from "./OneExercise.vue";
import PulseLoader from "vue-spinner/src/PulseLoader.vue";
import axios from "axios";

const state = reactive({
  exercises: [],
  isLoading: true,
});

defineProps({
  limit: Number,
  showButton: {
    type: Boolean,
    default: false,
  },
});

onMounted(async () => {
  try {
    const response = await axios.get(`http://localhost:8000/exercises`);
    state.exercises = response.data;
  } catch (e) {
    console.error("Error fetching exercises", e);
  } finally {
    state.isLoading = false;
  }
});
</script>

<template>
  <section class="bg-goPink py-10">
    <section class="px-4">
      <div class="container-xl lg:container m-auto">
        <!-- <h2 class="text-3xl font-bold text-black pb-6 text-center">
          Browse exercise
        </h2> -->
        <!-- Show loading spinner while loading is true -->
        <div v-if="state.isLoading" class="text-center text-red py-6">
          <PulseLoader />
        </div>

        <!-- Show OneExercise whien done loading -->
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OneExercise
            v-for="exc in state.exercises.slice(
              0,
              limit || state.exercises.length
            )"
            :key="exc.id"
            :exercise="exc"
          />
        </div>
      </div>
    </section>
    <section v-if="showButton" class="m-auto max-w-lg mt-5 px-6">
      <RouterLink
        to="/exercises"
        class="block bg-goRed text-white text-center py-4 px-6 rounded-xl hover:bg-gray-700"
        >View All Exercises</RouterLink
      >
    </section>
  </section>
</template>
