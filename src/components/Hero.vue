<script setup>
import logoClose from "@/assets/img/logo-close.png";

defineProps({
    title: {
        type: String,
        default: "designed to help you stay on track with your goals",
    },
    subtitle: {
        type: String,
        default: "stay tuned",
    },
});
</script>

<template>
    <section class="bg-goPink py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <img v-bind:src="logoClose" alt="Full logo" width="450" />
            <div class="text-center">
                <h1 class="text-4xl font-extrabold text-goRed sm:text-4xl md:text-5xl">
                    {{ title }}
                </h1>
                <p class="my-4 text-2xl text-goRed">{{ subtitle }}</p>
            </div>
        </div>
    </section>
</template>
