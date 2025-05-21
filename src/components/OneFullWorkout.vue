<script setup>
import { RouterLink } from "vue-router";

const props = defineProps({
    workout: Object,
});
</script>

<template>
    <div class="bg-white rounded-xl shadow-md relative p-4 flex flex-col justify-between">
        <div class="flex-grow">
            <div class="mb-3">
                <div class="text-gray-500 my-2">{{ workout.name }}</div>
                <h3 class="text-xl font-bold">{{ workout.name }}</h3>
            </div>

            <div class="mb-2">
                <p>{{ workout.description }}</p>
            </div>

            <div class="text-goDarkPink my-3">
                <h3>Warm-up: {{ workout.allExercises.warmUp }}</h3>
                <h3>Main Workout: {{ workout.allExercises.mainWorkout }}</h3>
                <h3>Cool-down: {{ workout.allExercises.coolDown }}</h3>
            </div>
        </div>

        <div class="border border-white my-2"></div>

        <div class="flex flex-col lg:flex-row justify-between">
            <div class="text-goRed mb-3">Coach: {{ workout.coach }}</div>

            <RouterLink
                :to="'/workouts/' + workout._id"
                class="h-[36px] bg-goDarkPink hover:bg-goRed text-white px-4 py-2 rounded-lg text-center text-sm"
            >
                Pick Workout
            </RouterLink>
        </div>
    </div>
</template>
