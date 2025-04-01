<script setup>
import PulseLoader from "vue-spinner/src/PulseLoader.vue";
import { reactive, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import BacktoExercisesBtn from "../components/BacktoExercisesBtn.vue";
import axios from "axios";

const route = useRoute();
const exerciseId = route.params.id;
const state = reactive({
  exercise: {},
  isLoading: true,
});
onMounted(async () => {
  try {
    const response = await axios.get(
      `/api/exercises/${exerciseId}`
    );
    state.exercise = response.data;
  } catch (e) {
    console.error("Error fetching exercise", e);
  } finally {
    state.isLoading = false;
  }
});
</script>
<template>
  <BacktoExercisesBtn />
  <section v-if="!state.isLoading" class="bg-goLightPink">
    <div class="container m-auto py-10 px-6">
      <div class="grid grid-cols-1 md:grid-cols-70/30 w-full gap-6">
        <main>
          <div
            class="bg-white p-6 rounded-lg shadow-md text-center md:text-left"
          >
            <div class="text-gray-500 mb-4">{{ state.exercise.type }}</div>
            <h1 class="text-3xl font-bold mb-4">{{ state.exercise.title }}</h1>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-md mt-6">
            <h3 class="text-goMidRed text-lg font-bold mb-6">
              Exercise Description
            </h3>

            <p class="mb-4">
              {{ state.exercise.description }}
            </p class="mb-4">
            <p class="mb-4">{{ state.exercise.details }}</p>
            <p class="mb-4">Reps: {{ state.exercise.work.reps }}</p>
            <p class="mb-4">Duration: {{ state.exercise.work.duration }} sec</p>
            <p class="mb-4">Rest time between sets (in seconds): {{ state.exercise.work.restTime }} sec</p>
            <h3 class="text-goMidRed text-lg font-bold mb-2">Sets</h3>
            <p class="mb-4">{{ state.exercise.sets }}</p>
            <p class="mb-4">Rest time after all sets (in seconds) {{ state.exercise.restAfterAll }} sec</p>
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
             :to="`/exercises/edit/${state.exercise.id}`"
              class="bg-goDarkPink hover:bg-red-600 text-white text-center font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mb-4 block"
              >Edit Exercise</RouterLink
            >
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline block"
            >
              Delete Exercise
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
