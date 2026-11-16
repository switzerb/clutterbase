<script setup lang="ts">
import { useRoute } from 'vue-router'
import { mockItemId } from '../router/mock-items'
import NotFoundView from './NotFoundView.vue'
const route = useRoute()
</script>

<template>
  <template v-if="route.params.id === mockItemId">
    <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Sample item</h1>
    <p class="mt-4 text-muted">This public-safe item is a prototype placeholder.</p>
    <RouterLink to="/" class="mt-6 inline-block text-accent underline"
      >Return to Archive</RouterLink
    >
  </template>
  <NotFoundView v-else item />
</template>
