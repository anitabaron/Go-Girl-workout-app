<script setup>
import Hero from "@/components/Hero.vue";
import HomeCards from "@/components/HomeCards.vue";
import ExcercisesList from "@/components/ExercisesList.vue";
import WorkoutsList from "../components/WorkoutsList.vue";
</script>

<template>
    <Hero />
    <HomeCards />
    <h2 class="text-3xl font-bold text-black pt-6 text-center bg-goPink">Workouts</h2>
    <WorkoutsList :limit="3" :showButton="true" :details="false" />
    <h2 class="text-3xl font-bold text-black pt-6 text-center bg-goLightPink">Excercises</h2>
    <ExcercisesList :limit="3" :showButton="true" :details="false" />
</template>
