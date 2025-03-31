<script setup>
import { RouterLink } from "vue-router";
</script>
<template>
  <section class="text-center flex flex-col justify-center items-center h-96">
    <i class="pi pi-exclamation-triangle text-7xl mb-5"></i>
    <p class="text-xl mb-5">This page does not exist</p>
    <RouterLink
      to="/"
      class="bg-goDarkPink text-white rounded-md px-3 py-2 mt-4 hover:bg-goMidRed"
      >Go back</RouterLink
    >
  </section>
</template>
