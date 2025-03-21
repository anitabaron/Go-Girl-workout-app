<script setup>
import Hero from "@/components/Hero.vue";
import HomeCards from "@/components/HomeCards.vue";
import ExcercisesList from "@/components/ExercisesList.vue";
</script>

<template>
  <Hero />
  <HomeCards />
  <ExcercisesList :limit="3" :showButton="true" :details="false" />
</template>
