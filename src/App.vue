<script setup>
import Navbar from "@/components/Navbar.vue";
import Hero from "@/components/Hero.vue";
import HomeCards from "./components/HomeCards.vue";
import ExcercisesList from "./components/ExcercisesList.vue";
</script>

<template>
  <Navbar />
  <Hero />
  <HomeCards />
  <ExcercisesList :limit="3" :showButton="true" />
</template>
