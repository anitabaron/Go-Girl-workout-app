<script setup>
import { RouterLink } from "vue-router";
import { ref, computed } from "vue";

const { exercise } = defineProps({
    exercise: Object,
});
const showDetails = ref(false);
const truncDetails = computed(() => {
    if (!exercise.details) return "...";
    return showDetails.value ? exercise.details : exercise.details.substring(0, 0) + "...";
});
const toggleFullDetails = () => {
    showDetails.value = !showDetails.value;
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-md relative p-4 flex flex-col justify-between">
        <div class="flex-grow">
            <div class="mb-3">
                <div class="text-gray-500 my-2">{{ exercise.type }}</div>
                <h3 class="text-xl font-bold">{{ exercise.title }}</h3>
            </div>

            <div class="mb-2">
                <p>{{ exercise.description }}</p>
            </div>

            <p>{{ truncDetails }}</p>
            <button @click="toggleFullDetails" class="text-goRed hover:text-black mb-1">
                {{ showDetails ? "Hide" : "Show details" }}
            </button>
            <div class="text-goDarkPink my-3">
                <h3>Reps: {{ exercise.work.reps }}</h3>
                <h3>Duration: {{ exercise.work.duration }}</h3>
                <h3>Rest time between sets (in seconds) {{ exercise.work.restTime }}</h3>

                <h3 v-if="exercise.sides !== 'no'" class="text-goDarkPink mb-2">Sides: {{ exercise.sides }}</h3>
            </div>
        </div>

        <div class="border border-white my-2"></div>

        <div class="flex flex-col lg:flex-row justify-between">
            <div class="text-goRed mb-3">Sets: {{ exercise.sets }}</div>

            <RouterLink
                :to="'/exercises/' + exercise.id"
                class="h-[36px] bg-goDarkPink hover:bg-goRed text-white px-4 py-2 rounded-lg text-center text-sm"
            >
                Details
            </RouterLink>
        </div>
    </div>
</template>
