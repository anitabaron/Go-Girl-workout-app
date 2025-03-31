<script setup>
defineProps({
  bg: {
    type: String,
    default: "bg-goDarkPink",
  },
});
</script>

<template>
  <div :class="`${bg} p-6 rounded-lg shadow-md`">
    <slot></slot>
  </div>
</template>
