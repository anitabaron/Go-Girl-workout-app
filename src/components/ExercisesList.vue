<script setup>
import { RouterLink } from "vue-router";
import { reactive, onMounted } from "vue";
import OneExercise from "./OneExercise.vue";
import PulseLoader from "vue-spinner/src/PulseLoader.vue";
import axios from "axios";
import AddExerciseButton from "./AddExerciseButton.vue";

const state = reactive({
    exercises: [],
    isLoading: true,
});

defineProps({
    limit: Number,
    showButton: {
        type: Boolean,
        default: false,
    },
});

const baseURL = "http://localhost:8000/api";

onMounted(async () => {
    try {
        const response = await axios.get(`${baseURL}/exercises`);
        state.exercises = response.data;
    } catch (e) {
        console.error("Error fetching exercises", e);
    } finally {
        state.isLoading = false;
    }
});
</script>

<template>
    <section class="bg-goLightPink pb-6">
        <AddExerciseButton v-if="$route.name !== 'home'" />
        <section class="px-4 pt-6">
            <div class="container-xl lg:container m-auto">
                <!-- Show loading spinner while loading is true -->
                <div v-if="state.isLoading" class="text-center text-red py-6">
                    <PulseLoader />
                </div>
                <!-- Show OneExercise when done loading -->
                <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <OneExercise
                        v-for="exercise in state.exercises.slice(0, limit || state.exercises.length)"
                        :key="exercise.id"
                        :exercise="exercise"
                    />
                </div>
            </div>
        </section>
        <section v-if="showButton" class="m-auto max-w-lg mt-5 px-6">
            <RouterLink to="/exercises" class="block bg-goMidRed text-white text-center py-4 px-6 rounded-xl hover:bg-goRed"
                >View All Exercises</RouterLink
            >
        </section>
    </section>
</template>
