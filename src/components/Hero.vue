<script setup>
import { defineProps } from "vue";
import logoClose from "@/assets/img/logo-close.png";

defineProps({});
</script>

<template>
  <section class="bg-goPink py-10 mb-4">
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
    >
      <img v-bind:src="logoClose" alt="Full logo" width="500" height="600" />
      <div class="text-center">
        <h1 class="text-4xl font-extrabold text-goRed sm:text-5xl md:text-6xl">
          designed to help you stay on track with your goals
        </h1>
        <p class="my-4 text-2xl text-goRed">stay tuned</p>
      </div>
    </div>
  </section>
</template>
