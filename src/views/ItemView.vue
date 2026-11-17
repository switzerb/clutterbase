<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { displayTitle, findArchiveItem } from '../data/archive'
import { mockItemId } from '../router/mock-items'
import NotFoundView from './NotFoundView.vue'
const route = useRoute()
const item = computed(() => findArchiveItem(route.params.id))
</script>

<template>
  <template v-if="route.params.id === mockItemId || item">
    <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">
      {{ item ? displayTitle(item) : 'Sample item' }}
    </h1>
    <p class="mt-4 text-muted">
      This synthetic item is a prototype placeholder. Item details are not yet available.
    </p>
    <RouterLink to="/" class="mt-6 inline-block text-accent underline"
      >Return to Archive</RouterLink
    >
  </template>
  <NotFoundView v-else item />
</template>
