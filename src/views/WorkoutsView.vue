<script setup>
// import OneFullWorkout from "../components/OneFullWorkout.vue";
import PulseLoader from "vue-spinner/src/PulseLoader.vue";
import { reactive, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import BackToWorkouts from "../components/BackToWorkoutsBtn.vue";
import axios from "axios";
import CountdownTimer from "../components/CountdownTimer.vue";

const route = useRoute();
const workoutId = route.params.id;
const state = reactive({
  workout: {},
  isLoading: true,
});
onMounted(async () => {
  try {
    const response = await axios.get(`/api/workouts/${workoutId}`);
    state.workout = response.data;
  } catch (e) {
    console.error("Error fetching workout", e);
  } finally {
    state.isLoading = false;
  }
});
</script>

<template>
  <BackToWorkouts />
  <CountdownTimer />
    <section v-if="!state.isLoading" class="bg-goLightPink">
    <div class="container m-auto py-10 px-6">
      <div class="grid grid-cols-1 md:grid-cols-70/30 w-full gap-6">
        <main>
          <div
            class="bg-white p-6 rounded-lg shadow-md text-center md:text-left"
          >
            <h3 class="text-goMidRed text-lg font-bold mb-6">Workout Name
            </h3>
            <h1 class="text-3xl font-bold mb-4">{{ state.workout.name }}</h1>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-md mt-6">
            <h3 class="text-goMidRed text-lg font-bold mb-6">
              Workout Description
            </h3>

            <p class="mb-4">
              {{ state.workout.description }}
            </p class="mb-4">
             <p>Warm-up: {{ state.workout.allExercises.warmUp }}</p>
        <p>Main Workout: {{ state.workout.allExercises.mainWorkout }}</p>
        <p>Cool-down: {{ state.workout.allExercises.coolDown }}</p>
            <h3 class="text-goMidRed text-lg font-bold mb-2">Coach: {{ state.workout.coach }}</h3>
          </div>
        </main>

        <!-- Sidebar -->
        <aside>
          <!-- Info -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-bold mb-6">Info</h3>

            <h2 class="text-2xl">About Lorem</h2>

            <p class="my-2">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Harum,
              assumenda.
            </p>

            <hr class="my-4" />

            <h3 class="text-xl">More:</h3>

            <p class="my-2 bg-goLightPink p-2 font-bold">www.some-example-link.com</p>
          </div>

          <!-- Manage -->
          <div class="bg-white p-6 rounded-lg shadow-md mt-6">
            <RouterLink
             :to="`/workouts/edit/${state.workout.id}`"
              class="bg-goDarkPink hover:bg-red-600 text-white text-center font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mb-4 block"
              >Edit workout</RouterLink
            >
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline block"
            >
              Delete workout
            </button>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <!-- Show loading spinner while loading is true -->
  <div v-else class="text-center text-red py-6">
    <PulseLoader />
  </div>
</template>
