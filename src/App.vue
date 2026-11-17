<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import { mockItemId } from './router/mock-items'
import { displayTitle, findArchiveItem } from './data/archive'

const route = useRoute()
let initialized = false
watch(
  [() => route.path, () => route.matched.length],
  async () => {
    if (!route.matched.length) return
    const item = route.name === 'item' ? findArchiveItem(route.params.id) : undefined
    const title =
      route.name === 'item'
        ? route.params.id === mockItemId
          ? 'Sample item'
          : item
            ? displayTitle(item)
            : 'Item not found'
        : typeof route.meta.title === 'string'
          ? route.meta.title
          : 'Page not found'
    document.title = `${title} · Clutterbase`
    if (!initialized) {
      initialized = true
      return
    }
    await nextTick()
    document.querySelector<HTMLElement>('main h1')?.focus()
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <div class="min-h-dvh bg-canvas text-foreground antialiased">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-canvas focus:p-2 focus:text-accent"
      >Skip to main content</a
    >
    <AppHeader />
    <main id="main" tabindex="-1" class="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <RouterView />
    </main>
  </div>
</template>
