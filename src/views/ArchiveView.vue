<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArchiveCard from '../components/archive/ArchiveCard.vue'
import UiButton from '../components/ui/UiButton.vue'
import UiFeedback from '../components/ui/UiFeedback.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiLink from '../components/ui/UiLink.vue'
import UiSelect from '../components/ui/UiSelect.vue'
import { archiveItems, displayTitle } from '../data/archive'

const route = useRoute()
const router = useRouter()
const search = ref('')
const type = ref('all')
const sort = ref('newest')
let pending = 0

function restoreCriteria() {
  search.value = typeof route.query.q === 'string' ? route.query.q : ''
  type.value = route.query.type === 'photo' || route.query.type === 'pdf' ? route.query.type : 'all'
  sort.value = route.query.sort === 'oldest' ? 'oldest' : 'newest'
}
watch(
  () => route.query,
  () => {
    if (!pending) restoreCriteria()
  },
  { immediate: true },
)

async function updateUrl(replace = false) {
  const query = { ...route.query }
  delete query.q
  delete query.type
  delete query.sort
  if (search.value) query.q = search.value
  if (type.value !== 'all') query.type = type.value
  if (sort.value !== 'newest') query.sort = sort.value
  pending++
  try {
    await router[replace ? 'replace' : 'push']({ query })
  } finally {
    pending--
    if (!pending) restoreCriteria()
  }
}

function clearCriteria() {
  search.value = ''
  type.value = 'all'
  sort.value = 'newest'
  void updateUrl()
}

// Prototype-only matching over the text actually shown on a card.
// Reproduce no results with /?q=definitely-not-in-the-demo.
const results = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  return archiveItems
    .filter((item) => {
      const pdfLabel =
        item.type === 'pdf'
          ? item.pageCount
            ? `PDF · ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`
            : 'PDF'
          : ''
      const text = [
        displayTitle(item),
        item.people?.join(', '),
        item.approximateDate,
        item.description,
        pdfLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
      return (type.value === 'all' || item.type === type.value) && text.includes(term)
    })
    .sort(
      (a, b) =>
        (Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt)) * (sort.value === 'oldest' ? 1 : -1),
    )
})
const hasCriteria = computed(
  () => !!search.value || type.value !== 'all' || sort.value !== 'newest',
)
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
  <template v-else>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UiInput
        id="archive-search"
        label="Search archive"
        :model-value="search"
        type="search"
        @update:model-value="
          (value) => {
            search = value
            void updateUrl(true)
          }
        "
      />
      <UiSelect
        id="archive-type"
        label="File type"
        :model-value="type"
        @update:model-value="
          (value) => {
            type = value
            void updateUrl()
          }
        "
      >
        <option value="all">All files</option>
        <option value="photo">Photos</option>
        <option value="pdf">PDFs</option>
      </UiSelect>
      <UiSelect
        id="archive-sort"
        label="Sort by"
        :model-value="sort"
        @update:model-value="
          (value) => {
            sort = value
            void updateUrl()
          }
        "
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </UiSelect>
      <div class="flex items-end">
        <UiButton variant="secondary" :disabled="!hasCriteria" @click="clearCriteria"
          >Clear all</UiButton
        >
      </div>
    </div>
    <p class="mt-6" role="status">
      {{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}
    </p>
    <UiFeedback
      v-if="!results.length"
      class="mt-4"
      state="empty"
      title="No results"
      description="No demo items match these criteria. Try different criteria or clear them."
    >
      <template #actions
        ><UiButton variant="secondary" @click="clearCriteria">Clear criteria</UiButton></template
      >
    </UiFeedback>
    <ul
      v-else
      aria-label="Archive items"
      class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ArchiveCard v-for="item in results" :key="item.id" :item="item" />
    </ul>
  </template>
</template>
