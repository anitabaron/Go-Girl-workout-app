<script setup>
const workout = {
    id: "b432",
    name: "Full Body Blast",
    description: "A complete full-body workout to build strength and endurance.",
    coach: "Anna",
    allExercises: {
        warmUp: ["Jumping Jacks", "Arm Circles"],
        mainWorkout: ["Push-ups", "Squats", "Burpees"],
        coolDown: ["Child's Pose", "Deep Breathing"],
    },
};
</script>

<template>
    <section class="p-6 max-w-3xl m-auto">
        <h1 class="text-3xl font-bold mb-2">{{ workout.name }}</h1>
        <p class="mb-4 text-gray-600">{{ workout.description }}</p>
        <p><strong>Coach:</strong> {{ workout.coach }}</p>

        <div class="mt-6">
            <h2 class="text-xl font-semibold">Exercises</h2>
            <p><strong>Warm-up:</strong> {{ workout.allExercises.warmUp.join(", ") }}</p>
            <p><strong>Main:</strong> {{ workout.allExercises.mainWorkout.join(", ") }}</p>
            <p><strong>Cool-down:</strong> {{ workout.allExercises.coolDown.join(", ") }}</p>
        </div>
    </section>
</template>
