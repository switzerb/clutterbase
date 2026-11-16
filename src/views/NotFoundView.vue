<script setup lang="ts">
defineProps<{ item?: boolean }>()
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">
    {{ item ? 'Item not found' : 'Page not found' }}
  </h1>
  <p class="mt-4 text-muted">
    {{ item ? 'This archive item could not be found.' : 'This page could not be found.' }}
  </p>
  <RouterLink to="/" class="mt-6 inline-block text-accent underline">Return to Archive</RouterLink>
</template>
