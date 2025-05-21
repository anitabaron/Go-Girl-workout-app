<script setup>
import { computed, onMounted, reactive } from "vue";
import axios from "axios";

const state = reactive({
    statistics: [],
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
        const response = await axios.get(`${baseURL}/statistics`);
        state.statistics = response.data;
    } catch (e) {
        console.error("Error fetching statistics", e);
    } finally {
        state.isLoading = false;
    }
});

const personalRecords = computed(() => {
    const pr = {};
    state.statistics.forEach((session) => {
        for (const [exercise, reps] of Object.entries(session.exercises)) {
            const total = reps.reduce((a, b) => a + b, 0);
            if (!pr[exercise] || total > pr[exercise]) {
                pr[exercise] = total;
            }
        }
    });
    return pr;
});

const isWorse = (index, reps, name) => {
    if (index === 0) return false;
    const prev = state.statistics[index - 1].exercises[name];
    if (!prev) return false;
    const currTotal = reps.reduce((a, b) => a + b, 0);
    const prevTotal = prev.reduce((a, b) => a + b, 0);
    return currTotal < prevTotal;
};

const isPR = (reps, name) => {
    const total = reps.reduce((a, b) => a + b, 0);
    return total === personalRecords.value[name];
};
</script>

<template>
    <div class="p-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div
            v-for="(session, index) in state.statistics"
            :key="index"
            class="bg-white rounded-2xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition"
        >
            <h2 class="text-xl font-bold mb-4 text-gray-800">Workout - {{ session.date }}</h2>
            <table class="w-full text-sm text-left text-gray-700">
                <thead>
                    <tr class="border-b border-gray-300">
                        <th class="py-1 pr-4 font-semibold">Exercise</th>
                        <th class="py-1 font-semibold">Reps/Time</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(reps, name) in session.exercises" :key="name" class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="py-1 pr-4">{{ name }}</td>
                        <td class="py-1">
                            <span
                                :class="[isWorse(index, reps, name) ? ' text-orange-500' : '', isPR(reps, name) ? 'font-bold text-goDarkPink' : '']"
                            >
                                {{ reps.join(" / ") }}
                            </span>

                            <span v-if="isPR(reps, name)" class="ml-2 text-xs text-white bg-goDarkPink px-2 py-0.5 rounded-full"> PR </span>

                            <span v-if="name === 'Plank Hold'" class="text-xs text-gray-400 ml-1"> sec </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
