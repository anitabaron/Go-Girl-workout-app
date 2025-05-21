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
                <div class="flex flex-1 items-center justify-center md:items-stretch md:justify-start">
                    <!-- Logo -->
                    <RouterLink class="flex flex-shrink-0 items-center mr-4 rounded-3xl transition-transform duration-300 hover:scale-110" to="/">
                        <img class="h-10 w-auto" v-bind:src="logo" alt="Go Girl" />
                    </RouterLink>
                    <!-- Nav -->
                    <div class="md:ml-auto">
                        <div class="flex space-x-2">
                            <RouterLink
                                to="/workout-demo"
                                :class="[
                                    isActiveLink('/workout-demo') ? 'bg-goDarkPink ' : 'hover:bg-goMidRed hover:transition-all hover:duration-30 ',
                                    'text-white',
                                    'underline',
                                    'font-medium',
                                    'px-3',
                                    'py-2',
                                    'rounded-md',
                                ]"
                                >Start demo workout</RouterLink
                            >
                            <RouterLink
                                to="/workouts"
                                :class="[
                                    isActiveLink('/workouts') ? 'bg-goDarkPink ' : 'hover:bg-goMidRed hover:transition-all hover:duration-30 ',
                                    'text-white',
                                    'font-medium',
                                    'px-3',
                                    'py-2',
                                    'rounded-md',
                                ]"
                                >Workouts</RouterLink
                            >

                            <RouterLink
                                to="/exercises"
                                :class="[
                                    isActiveLink('/exercises') ? 'bg-goDarkPink ' : 'hover:bg-goMidRed hover:transition-all hover:duration-30 ',
                                    'text-white',
                                    'font-medium',
                                    'px-3',
                                    'py-2',
                                    'rounded-md',
                                ]"
                                >Exercises</RouterLink
                            >
                            <RouterLink
                                to="/statistics"
                                :class="[
                                    isActiveLink('/statistics') ? 'bg-goDarkPink ' : 'hover:bg-goMidRed hover:transition-all hover:duration-30 ',
                                    'text-white',
                                    'font-medium',
                                    'px-3',
                                    'py-2',
                                    'rounded-md',
                                ]"
                                >Statistics</RouterLink
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>
