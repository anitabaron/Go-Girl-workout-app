<script setup>
import { RouterLink } from "vue-router";
import { reactive, onMounted } from "vue";
import PulseLoader from "vue-spinner/src/PulseLoader.vue";
import axios from "axios";
import OneFullWorkout from "./OneFullWorkout.vue";

const state = reactive({
  workouts: [],
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
    const response = await axios.get(`/api/workouts`);
    state.workouts = response.data;
  } catch (e) {
    console.error("Error fetching workouts", e);
  } finally {
    state.isLoading = false;
  }
});
</script>

<template>
  <section class="bg-goPink pt-6 pb-6">
    <section class="px-4">
      <div class="container-xl lg:container m-auto">
        <div v-if="state.isLoading" class="text-center text-red py-6">
          <PulseLoader />
        </div>

        <!-- Show OneWorkout whien done loading -->
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OneFullWorkout
            v-for="workout in state.workouts.slice(
              0,
              limit || state.workouts.length
            )"
            :key="workout.id"
            :workout="workout"
          />
        </div>
      </div>
    </section>
    <section v-if="showButton" class="m-auto max-w-lg mt-5 px-6">
      <RouterLink
        to="/workouts"
        class="block bg-goMidRed text-white text-center py-4 px-6 rounded-xl hover:bg-goRed"
        >View All Workouts</RouterLink
      >
    </section>
  </section>
</template>
