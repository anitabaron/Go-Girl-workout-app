<script setup>
import { RouterLink, useRoute } from "vue-router";
import logo from "@/assets/img/logo.png";

const isActiveLink = (routePath) => {
  const route = useRoute();
  return route.path === routePath;
};
</script>

<template>
  <nav class="bg-goRed border-b border-goRed">
    <div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
      <div class="flex h-20 items-center justify-between">
        <div
          class="flex flex-1 items-center justify-center md:items-stretch md:justify-start"
        >
          <!-- Logo -->
          <RouterLink
            class="flex flex-shrink-0 items-center mr-4 rounded-3xl transition-transform duration-300 hover:scale-110"
            to="/"
          >
            <img class="h-10 w-auto" v-bind:src="logo" alt="Go Girl" />
          </RouterLink>
          <div class="md:ml-auto">
            <div class="flex space-x-2">
              <RouterLink
                to="/workouts"
                class="text-white font-medium hover:bg-goDarkPink hover:text-white rounded-md px-3 py-2 transition-all duration-300"
                >Workouts</RouterLink
              >
              <RouterLink
                to="/exercises"
                class="text-white font-medium hover:bg-goDarkPink hover:text-white rounded-md px-3 py-2 transition-all duration-300"
                >Exercises</RouterLink
              >
              <RouterLink
                to="/statistics"
                class="text-white font-medium hover:bg-goDarkPink hover:text-white rounded-md px-3 py-2 transition-all duration-300"
                >Statistics</RouterLink
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
