<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { displayTitle, findArchiveItem } from '../data/archive'
import { mockItemId } from '../router/mock-items'
import NotFoundView from './NotFoundView.vue'

const route = useRoute()
const item = computed(() => findArchiveItem(route.params.id))
const broken = ref(false)
watch(
  () => route.params.id,
  () => {
    broken.value = false
  },
)
const uploadDate = computed(() =>
  item.value
    ? new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(item.value.uploadedAt),
      )
    : '',
)
</script>

<template>
  <template v-if="item">
    <nav aria-label="Breadcrumb" class="mb-6 min-w-0 text-muted">
      <ol class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <li>
          <RouterLink
            to="/"
            class="text-accent underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >Archive</RouterLink
          >
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" class="min-w-0 [overflow-wrap:anywhere]">
          {{ displayTitle(item) }}
        </li>
      </ol>
    </nav>
    <h1 tabindex="-1" class="mb-6 text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
      {{ displayTitle(item) }}
    </h1>
    <div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
      <figure class="min-w-0">
        <div
          class="flex min-h-64 items-center justify-center rounded-lg border border-border bg-surface p-4"
        >
          <img
            v-if="item.preview.state === 'ready' && !broken"
            :src="item.preview.src"
            :alt="
              item.type === 'pdf' ? 'Illustrated first page preview' : 'Illustrated photo preview'
            "
            class="max-h-[70vh] w-full object-contain"
            @error="broken = true"
          />
          <p v-else class="text-center text-muted">
            {{
              broken || item.preview.state === 'failed'
                ? 'Preview unavailable'
                : item.preview.state === 'processing'
                  ? 'Preview processing'
                  : 'No preview available'
            }}
          </p>
        </div>
        <figcaption
          v-if="item.type === 'pdf' && item.preview.state === 'ready' && !broken"
          class="mt-2 text-sm text-muted"
        >
          Prepared first-page image; this is not a PDF viewer.
        </figcaption>
      </figure>
      <div class="min-w-0 space-y-8 [overflow-wrap:anywhere]">
        <section v-if="item.people?.length || item.approximateDate || item.description">
          <h2 class="text-xl font-semibold">Details</h2>
          <dl class="mt-3 space-y-3">
            <div v-if="item.people?.length">
              <dt class="font-semibold">People</dt>
              <dd>{{ item.people.join(', ') }}</dd>
            </div>
            <div v-if="item.approximateDate">
              <dt class="font-semibold">Approximate date</dt>
              <dd>{{ item.approximateDate }}</dd>
            </div>
            <div v-if="item.description">
              <dt class="font-semibold">Description</dt>
              <dd>{{ item.description }}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h2 class="text-xl font-semibold">File information</h2>
          <dl class="mt-3 space-y-3">
            <div>
              <dt class="font-semibold">Filename</dt>
              <dd>{{ item.filename }}</dd>
            </div>
            <div>
              <dt class="font-semibold">Type</dt>
              <dd>{{ item.type === 'pdf' ? 'PDF' : 'Photo' }}</dd>
            </div>
            <div v-if="item.pageCount">
              <dt class="font-semibold">Pages</dt>
              <dd>{{ item.pageCount }}</dd>
            </div>
            <div v-if="item.uploadedAt">
              <dt class="font-semibold">Uploaded</dt>
              <dd>{{ uploadDate }}</dd>
            </div>
          </dl>
        </section>
        <section v-if="item.aiSuggestion" class="rounded-lg border border-border bg-surface p-4">
          <h2 class="text-xl font-semibold">Mock AI suggestion</h2>
          <p class="mt-2">{{ item.aiSuggestion }}</p>
          <p class="mt-2 text-muted">This suggestion has not been added to the item details.</p>
        </section>
      </div>
    </div>
  </template>
  <template v-else-if="route.params.id === mockItemId">
    <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Sample item</h1>
    <p class="mt-4 text-muted">
      This synthetic item is a prototype placeholder. Item details are not yet available.
    </p>
    <RouterLink to="/" class="mt-6 inline-block text-accent underline"
      >Return to Archive</RouterLink
    >
  </template>
  <NotFoundView v-else item />
</template>
