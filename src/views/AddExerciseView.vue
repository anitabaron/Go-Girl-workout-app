<script setup>
import { RouterLink } from "vue-router";
</script>
<template>
  <section class="bg-goLightPink">
    <div class="container m-auto max-w-2xl py-24">
      <div
        class="bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0"
      >
        <form>
          <h2 class="text-3xl text-center font-semibold mb-6">Add Exercise</h2>

          <div class="mb-2">
            <label for="type" class="block text-gray-700 font-bold mb-2"
              >Type</label
            >
            <select
              id="type"
              name="type"
              class="border rounded w-full py-2 px-3"
              required
            >
              <option value="Full-Time">Warm-up</option>
              <option value="Part-Time">Main Workout</option>
              <option value="Remote">Cool-down</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-gray-700 font-bold mb-2"
              >Exercise title</label
            >
            <input
              type="text"
              id="name"
              name="name"
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
              name="reps"
              class="border rounded w-full py-1 px-3"
              required
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
              name="duration"
              class="border rounded w-full py-1 px-3"
              required
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
              >Rest time in sec</label
            >
            <select
              id="restTime"
              name="restTime"
              class="border rounded w-full py-1 px-3"
              required
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
              name="sides"
              class="border rounded w-full py-1 px-3"
              required
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
              >Series</label
            >
            <select
              id="series"
              name="series"
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
            <label for="details" class="block text-gray-700 font-bold mb-2"
              >Details (if needed)</label
            >
            <textarea
              id="details"
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
              required
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
