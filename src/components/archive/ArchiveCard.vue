<script setup lang="ts">
import { ref, watch } from 'vue'
import { displayTitle, type ArchiveItem } from '../../data/archive'
import UiStatus from '../ui/UiStatus.vue'
import { useRoute } from 'vue-router'
import { appPinia, useCollectionContext } from '../../stores/collection-context'

const props = defineProps<{ item: ArchiveItem }>()
const broken = ref(false)
const route = useRoute()
function capture(event: MouseEvent) {
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  useCollectionContext(appPinia).capture({
    url: route.fullPath,
    itemId: props.item.id,
    originPosition: window.history.state?.position,
    x: window.scrollX,
    y: window.scrollY,
  })
}
watch(
  () => props.item,
  () => {
    broken.value = false
  },
)
</script>

<template>
  <li class="min-w-0">
    <RouterLink
      :to="{ name: 'item', params: { id: item.id } }"
      :data-archive-card="item.id"
      @click="capture"
      class="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <div class="flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface p-3">
        <img
          v-if="item.preview.state === 'ready' && !broken"
          :src="item.preview.src"
          :alt="
            item.type === 'pdf' ? 'Illustrated first page preview' : 'Illustrated garden preview'
          "
          class="h-full w-full object-contain"
          @error="broken = true"
        />
        <span v-else class="px-4 text-center text-muted">
          {{
            broken || item.preview.state === 'failed'
              ? 'Preview unavailable'
              : item.preview.state === 'processing'
                ? 'Preview processing'
                : 'No preview available'
          }}
        </span>
      </div>
      <div class="flex flex-col items-start gap-2 p-4">
        <UiStatus
          v-if="item.type === 'pdf'"
          :label="
            item.pageCount
              ? `PDF · ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`
              : 'PDF'
          "
        />
        <h2
          class="w-full text-xl font-semibold break-words [overflow-wrap:anywhere] group-hover:underline"
        >
          {{ displayTitle(item) }}
        </h2>
        <p v-if="item.people?.length" class="text-muted">{{ item.people.join(', ') }}</p>
        <p v-if="item.approximateDate" class="text-muted">{{ item.approximateDate }}</p>
        <p v-if="item.description">{{ item.description }}</p>
      </div>
    </RouterLink>
  </li>
</template>
