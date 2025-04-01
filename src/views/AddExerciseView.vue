<script setup>
import router from "@/router";
import { reactive } from "vue";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
const form = reactive({
  type: "Main Workout",
  title: "",
  description: "",
  work: {
    reps: 10,
    duration: 10,
    restTime: 30,
  },
  sets: 3,
  restAfterAll: 120,
  sides: "no",
  level: 1,
  details: "",
});
const handleSubmit = async () => {
  const newExercise = {
    id: uuidv4(),
    type: form.type,
    title: form.title,
    description: form.description,
    work: {
      reps: form.work.reps,
      duration: form.work.duration,
      restTime: form.work.restTime,
    },
    sets: form.sets,
    restAfterAll: form.restAfterAll,
    sides: form.sides,
    level: form.level,
    details: form.details,
  };
  try {
    const response = await axios.post("/api/exercises", newExercise);
    router.push(`/exercises/${response.data.id}`);
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
          <h2 class="text-3xl text-center font-semibold mb-6">Add Exercise</h2>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Type</label
            >
            <select
              v-model="form.type"
              id="type"
              name="type"
              class="border rounded w-full py-2 px-3"
              required
            >
              <option value="Warm-up">Warm-up</option>
              <option value="Main Workout">Main Workout</option>
              <option value="Cool-down">Cool-down</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2"
              >Exercise title</label
            >
            <input
              type="text"
              v-model="form.title"
              id="title"
              name="title"
              class="border rounded w-full py-2 px-3 mb-2"
              placeholder="eg. Shoulder Stretch"
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
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Reps</label
            >
            <select
              id="reps"
              v-model="form.work.reps"
              name="reps"
              class="border rounded w-full py-1 px-3"
            >
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="14">14</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Duration time in sec</label
            >
            <select
              id="duration"
              v-model="form.work.duration"
              name="duration"
              class="border rounded w-full py-1 px-3"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Rest time between sets (in seconds)</label
            >
            <select
              id="restTime"
              v-model="form.work.restTime"
              name="restTime"
              class="border rounded w-full py-1 px-3"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Sides (right-left)</label
            >
            <select
              id="sides"
              v-model="form.sides"
              name="sides"
              class="border rounded w-full py-1 px-3"
            >
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Level</label
            >
            <select
              id="level"
              v-model="form.level"
              name="level"
              class="border rounded w-full py-1 px-3"
              required
            >
              <option value="1">1-easy</option>
              <option value="2">2-medium</option>
              <option value="3">3-hard</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-goRed font-bold mb-2"
              >Sets</label
            >
            <select
              id="sets"
              v-model="form.sets"
              name="sets"
              class="border rounded w-full py-1 px-3"
              required
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Rest time after all sets (in seconds)</label
            >
            <select
              id="restAfterAll"
              v-model="form.restAfterAll"
              name="restAfterAll"
              class="border rounded w-full py-1 px-3"
            >
              <option value="60">60</option>
              <option value="90">90</option>
              <option value="120">120</option>
            </select>
          </div>

          <div class="mb-2">
            <label for="details" class="block text-gray-700 font-bold mb-2"
              >Details (if needed)</label
            >
            <textarea
              id="details"
              v-model="form.details"
              name="details"
              class="border rounded w-full py-2 px-3"
              rows="2"
              placeholder="Write details"
            ></textarea>
          </div>

          <h3 class="text-2xl mb-5">Info</h3>

          <div class="mb-4">
            <label
              for="exercise-video"
              class="block text-gray-700 font-bold mb-2"
              >Video</label
            >
            <input
              type="text"
              id="exercise-video"
              name="exercise-video"
              class="border rounded w-full py-2 px-3"
              placeholder="Link to video"
            />
          </div>

          <div>
            <button
              class="bg-goMidRed hover:bg-goRed text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Add Exercise
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
