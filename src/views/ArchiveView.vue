<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ArchiveCard from '../components/archive/ArchiveCard.vue'
import UiFeedback from '../components/ui/UiFeedback.vue'
import UiLink from '../components/ui/UiLink.vue'
import { archiveItems } from '../data/archive'

const route = useRoute()
// Demo recipes: /?demo=loading, /?demo=empty, /?demo=error. Recovery returns to /.
const state = computed(() => {
  const value = route.query.demo
  return value === 'loading' || value === 'empty' || value === 'error' ? value : 'ready'
})
const messages = {
  loading: ['Loading archive', 'This is a simulated loading state; no request is being made.'],
  empty: ['The archive is empty', 'This simulated archive has no items yet.'],
  error: [
    'Archive unavailable',
    'This is a simulated error. You can return to the demo collection.',
  ],
} as const
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Archive</h1>
  <p class="mt-3 text-muted">
    Demo collection · All items and images are synthetic. No archive is connected.
  </p>
  <UiFeedback
    v-if="state !== 'ready'"
    class="mt-6"
    :state="state"
    :title="messages[state][0]"
    :description="messages[state][1]"
  >
    <template #actions><UiLink href="/">Return to demo collection</UiLink></template>
  </UiFeedback>
  <ul
    v-else
    aria-label="Archive items"
    class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
  >
    <ArchiveCard v-for="item in archiveItems" :key="item.id" :item="item" />
  </ul>
</template>
