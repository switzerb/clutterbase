<script setup lang="ts">
import { computed, ref } from 'vue'
import UiSelect from '../components/ui/UiSelect.vue'
import UiStatus from '../components/ui/UiStatus.vue'
import { displayTitle, findArchiveItem } from '../data/archive'

// Fixed synthetic examples, not review state: AI suggestions and demo edits do not move items.
// Needs review: summer-letter and long-filename; Reviewed: garden-afternoon.
const examples = {
  'Needs review': ['summer-letter', 'long-filename'],
  Reviewed: ['garden-afternoon'],
} as const
const selection = ref('Needs review')
const items = computed(() =>
  examples[selection.value === 'Reviewed' ? 'Reviewed' : 'Needs review']
    .map(findArchiveItem)
    .filter((item) => item !== undefined),
)
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Inbox</h1>
  <p class="mt-3 text-muted">
    Demo content · These items and review statuses are synthetic examples. Review is not connected:
    completing or reopening reviews and saving review history are not available.
  </p>
  <div class="mt-6 max-w-sm">
    <UiSelect id="inbox-list" v-model="selection" label="Show examples" :size="2">
      <option value="Needs review">Needs review</option>
      <option value="Reviewed">Reviewed</option>
    </UiSelect>
  </div>
  <section class="mt-6" aria-labelledby="inbox-list-heading">
    <h2 id="inbox-list-heading" class="text-2xl font-semibold">{{ selection }}</h2>
    <ul class="mt-4 grid gap-4">
      <li
        v-for="item in items"
        :key="item.id"
        class="min-w-0 rounded-lg border border-border bg-surface p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <RouterLink
            :to="{ name: 'item', params: { id: item.id } }"
            class="min-w-0 font-semibold text-accent break-all underline decoration-2 underline-offset-4 hover:decoration-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >{{ displayTitle(item) }}</RouterLink
          >
          <UiStatus :label="selection" :tone="selection === 'Reviewed' ? 'success' : 'warning'" />
        </div>
        <p v-if="item.people?.length" class="mt-2">{{ item.people.join(', ') }}</p>
        <p v-if="item.approximateDate" class="mt-1 text-muted">{{ item.approximateDate }}</p>
        <p v-if="item.description" class="mt-2">{{ item.description }}</p>
      </li>
    </ul>
  </section>
</template>
