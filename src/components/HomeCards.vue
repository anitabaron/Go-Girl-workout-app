<script setup>
import { RouterLink } from "vue-router";
import Card from "@/components/Card.vue";
</script>

<template>
    <section>
        <div class="container-xl lg:container m-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-lg">
                <Card>
                    <h2 class="text-2xl font-bold">For Girl</h2>
                    <p class="mt-2 mb-4">Discover the perfect workout and unlock your inner strength today!</p>
                    <RouterLink to="/workouts" class="inline-block bg-black text-white rounded-lg px-4 py-2 hover:bg-goRed">
                        Browse Workout
                    </RouterLink>
                </Card>
                <Card bg="bg-goLightPink">
                    <h2 class="text-2xl font-bold">For Coach</h2>
                    <p class="mt-2 mb-4">Create the perfect workout to empower the girl</p>
                    <RouterLink to="/workouts/add" class="inline-block bg-black text-white rounded-lg px-4 py-2 hover:bg-goRed">
                        Add workout
                    </RouterLink>
                </Card>
            </div>
        </div>
    </section>
</template>
