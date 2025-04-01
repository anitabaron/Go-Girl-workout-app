<script setup>
import router from "@/router";
import { reactive } from "vue";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
const today = Date.now();
const form = reactive({
  name: "",
  description: "",
  allExercises: {
    warmUp: [],
    mainWorkout: [],
    coolDown: [],
  },
  coach: "",
});
const handleSubmit = async () => {
  const newWorkout = {
    id: uuidv4(),
    name: form.name,
    date: today,
    description: form.description,
    allExercises: {
      warmUp: form.allExercises.warmUp,
      mainWorkout: form.allExercises.mainWorkout,
      coolDown: form.allExercises.coolDown,
    },
    coach: form.coach,
  };
  try {
    const response = await axios.post("/api/workouts", newWorkout);
    router.push(`/workouts/${response.data.id}`);
  } catch (e) {
    console.error("Error fetching exercise", e);
  }
};
</script>
<template>
  <section class="bg-goLightPink">
    <div class="container m-auto max-w-2xl py-24">
      <div
        class="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0"
      >
        <form @submit.prevent="handleSubmit">
          <h2 class="text-3xl text-center font-semibold mb-6">Add Workout</h2>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2"
              >Workout title</label
            >
            <input
              type="text"
              v-model="form.name"
              id="name"
              name="name"
              class="border rounded w-full py-2 px-3 mb-2"
              placeholder="eg. Core strength"
              required
            />
          </div>
          <div class="mb-2">
            <label for="description" class="block text-gray-700 font-bold mb-2"
              >Description</label
            >
            <textarea
              id="description"
              v-model="form.description"
              name="description"
              class="border rounded w-full py-2 px-3"
              rows="3"
              placeholder="Write desctiption"
            ></textarea>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2">Warm-up</label>
            <div class="flex flex-col space-y-1">
              <label>
                <input
                  type="checkbox"
                  value="1"
                  v-model="form.allExercises.warmUp"
                  class="mr-2"
                />
                1
              </label>
              <label>
                <input
                  type="checkbox"
                  value="2"
                  v-model="form.allExercises.warmUp"
                  class="mr-2"
                />
                2
              </label>
              <label>
                <input
                  type="checkbox"
                  value="3"
                  v-model="form.allExercises.warmUp"
                  class="mr-2"
                />
                3
              </label>
            </div>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2"
              >Main workout</label
            >
            <div class="flex flex-col space-y-1">
              <label>
                <input
                  type="checkbox"
                  value="1"
                  v-model="form.allExercises.mainWorkout"
                  class="mr-2"
                />
                1
              </label>
              <label>
                <input
                  type="checkbox"
                  value="2"
                  v-model="form.allExercises.mainWorkout"
                  class="mr-2"
                />
                2
              </label>
              <label>
                <input
                  type="checkbox"
                  value="3"
                  v-model="form.allExercises.mainWorkout"
                  class="mr-2"
                />
                3
              </label>
            </div>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2">Cool-down</label>
            <div class="flex flex-col space-y-1">
              <label>
                <input
                  type="checkbox"
                  value="1"
                  v-model="form.allExercises.coolDown"
                  class="mr-2"
                />
                1
              </label>
              <label>
                <input
                  type="checkbox"
                  value="2"
                  v-model="form.allExercises.coolDown"
                  class="mr-2"
                />
                2
              </label>
              <label>
                <input
                  type="checkbox"
                  value="3"
                  v-model="form.allExercises.coolDown"
                  class="mr-2"
                />
                3
              </label>
            </div>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2">Coach</label>
            <input
              type="text"
              v-model="form.coach"
              id="coach"
              name="coach"
              class="border rounded w-full py-2 px-3 mb-2"
              placeholder=""
            />
          </div>

          <div>
            <button
              class="bg-goMidRed hover:bg-goRed text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Add Workout
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
