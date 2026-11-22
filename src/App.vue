<script setup lang="ts">
import { computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import { mockItemId } from './router/mock-items'
import { displayTitle, findArchiveItem } from './data/archive'
import { appPinia, useCollectionContext } from './stores/collection-context'
import { useSession } from './stores/session'

const route = useRoute()
const router = useRouter()
const session = useSession(appPinia)
watch(
  () => session.status,
  (status) => {
    if (route.meta.public || !route.matched.length) return
    if (status === 'signed-out') void router.replace('/login')
    else if (status === 'no-access' || status === 'error') void router.replace('/no-access')
    else if (status === 'admitted' && route.meta.owner && !session.owner)
      void router.replace('/no-access')
  },
)
function resume() {
  if (document.visibilityState !== 'hidden' && !route.meta.public) void session.refresh()
}
onMounted(() => {
  window.addEventListener('focus', resume)
  window.addEventListener('pageshow', resume)
  document.addEventListener('visibilitychange', resume)
})
onUnmounted(() => {
  window.removeEventListener('focus', resume)
  window.removeEventListener('pageshow', resume)
  document.removeEventListener('visibilitychange', resume)
})
let initialized = false
const pageTitle = computed(() => {
  const item = route.name === 'item' ? findArchiveItem(route.params.id) : undefined
  return route.name === 'item'
    ? route.params.id === mockItemId
      ? 'Sample item'
      : item
        ? displayTitle(item)
        : 'Item not found'
    : typeof route.meta.title === 'string'
      ? route.meta.title
      : 'Page not found'
})
watch(pageTitle, (title) => (document.title = `${title} · Clutterbase`), { immediate: true })
watch(
  [() => route.path, () => route.matched.length],
  async () => {
    if (!route.matched.length) return
    if (!initialized) {
      initialized = true
      return
    }
    await nextTick()
    if (route.path === '/' && useCollectionContext(appPinia).returning) return
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
      <div
        v-if="route.meta.public || session.archive"
        v-show="route.meta.public || session.admitted"
      >
        <RouterView :key="route.meta.public ? 'public' : session.revision" />
      </div>
      <p v-if="!route.meta.public && !session.admitted" role="status">Checking archive access…</p>
    </main>
  </div>
</template>
