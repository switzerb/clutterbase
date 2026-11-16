<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">{{ route.meta.title }}</h1>
  <p class="mt-4 text-muted">
    <template v-if="route.meta.destination === 'archive'"
      >Archive browsing is coming soon. This is a prototype placeholder.</template
    >
    <template v-else-if="route.meta.destination === 'upload'"
      >Upload is not connected. This prototype placeholder does not transfer files.</template
    >
    <template v-else
      >This destination is a prototype placeholder. No archive data is connected.</template
    >
  </p>
</template>
