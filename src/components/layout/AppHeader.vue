<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const links = [
  { label: 'Archive', to: '/', destination: 'archive' },
  { label: 'Inbox', to: '/inbox', destination: 'inbox' },
  { label: 'Family', to: '/family', destination: 'family' },
]
</script>

<template>
  <header class="border-b border-border bg-surface">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
      <RouterLink to="/" class="text-2xl font-semibold tracking-tight text-accent no-underline">
        Clutterbase<span aria-hidden="true" class="text-focus">.</span>
      </RouterLink>
      <nav aria-label="Primary" class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="route.meta.destination === link.destination ? 'page' : undefined"
          class="inline-flex min-h-control items-center px-2 text-foreground underline-offset-4 hover:underline"
          :class="route.meta.destination === link.destination ? 'font-semibold underline' : ''"
        >
          {{ link.label }}
        </RouterLink>
        <RouterLink
          to="/upload"
          :aria-current="route.meta.destination === 'upload' ? 'page' : undefined"
          class="inline-flex min-h-control items-center justify-center rounded-lg bg-accent px-4 py-2 font-medium text-on-accent hover:bg-accent-hover"
          :class="
            route.meta.destination === 'upload' ? 'underline underline-offset-4' : 'no-underline'
          "
        >
          Upload files
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
