<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { demoSavedItems, displayTitle, findArchiveItem } from '../data/archive'
import { mockItemId } from '../router/mock-items'
import UiButton from '../components/ui/UiButton.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiFeedback from '../components/ui/UiFeedback.vue'
import NotFoundView from './NotFoundView.vue'

const route = useRoute()
const item = computed(() => findArchiveItem(route.params.id))
const broken = ref(false)
const editing = ref(false)
const saved = computed(() => !!item.value && demoSavedItems.has(item.value.id))
const draft = reactive({ title: '', people: '', approximateDate: '', description: '' })
const attempted = ref(false)
const limits = { title: 200, people: 300, approximateDate: 200, description: 2000 }
const errors = computed(() => ({
  title: draft.title.length > limits.title ? `Use at most ${limits.title} characters.` : '',
  people: draft.people.length > limits.people ? `Use at most ${limits.people} characters.` : '',
  approximateDate:
    draft.approximateDate.length > limits.approximateDate
      ? `Use at most ${limits.approximateDate} characters.`
      : '',
  description:
    draft.description.length > limits.description
      ? `Use at most ${limits.description} characters.`
      : '',
}))
async function edit() {
  if (!item.value) return
  Object.assign(draft, {
    title: item.value.title ?? '',
    people: item.value.people?.join(', ') ?? '',
    approximateDate: item.value.approximateDate ?? '',
    description: item.value.description ?? '',
  })
  attempted.value = false
  editing.value = true
  await nextTick()
  document.getElementById('edit-title')?.focus()
}
async function closeEditor() {
  editing.value = false
  await nextTick()
  document.getElementById('edit-details')?.focus()
}
async function save() {
  if (!item.value) return
  attempted.value = true
  const firstError = Object.entries(errors.value).find(([, error]) => error)
  if (firstError) {
    await nextTick()
    document.getElementById(`edit-${firstError[0]}`)?.focus()
    return
  }
  Object.assign(item.value, {
    title: draft.title.trim(),
    people: draft.people
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
    approximateDate: draft.approximateDate.trim(),
    description: draft.description.trim(),
  })
  demoSavedItems.add(item.value.id)
  await closeEditor()
}
watch(
  () => route.params.id,
  () => {
    broken.value = false
    editing.value = false
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
        <div>
          <UiButton v-if="!editing" id="edit-details" variant="secondary" @click="edit">
            Edit details
          </UiButton>
          <section
            v-else
            aria-labelledby="edit-heading"
            class="rounded-lg border border-border bg-surface p-4"
          >
            <h2 id="edit-heading" class="text-xl font-semibold">Edit details</h2>
            <p class="mt-2 text-muted">
              This is a demo. Changes reset on reload and are not saved to an archive.
            </p>
            <form class="mt-4 grid min-w-0 gap-4" novalidate @submit.prevent="save">
              <UiInput
                id="edit-title"
                v-model="draft.title"
                label="Title"
                hint="Leave blank to use the filename."
                :error="attempted ? errors.title : ''"
              />
              <UiInput
                id="edit-people"
                v-model="draft.people"
                label="People"
                hint="Separate names with commas."
                :error="attempted ? errors.people : ''"
              />
              <UiInput
                id="edit-approximateDate"
                v-model="draft.approximateDate"
                label="Approximate date"
                :error="attempted ? errors.approximateDate : ''"
              />
              <div class="grid min-w-0 gap-2">
                <label for="edit-description" class="font-medium">Description</label>
                <textarea
                  id="edit-description"
                  v-model="draft.description"
                  rows="4"
                  :aria-invalid="attempted && errors.description ? 'true' : undefined"
                  :aria-describedby="
                    attempted && errors.description ? 'edit-description-error' : undefined
                  "
                  class="w-full min-w-0 rounded-lg border-2 bg-surface-raised px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                  :class="
                    attempted && errors.description
                      ? 'border-danger border-dashed'
                      : 'border-border hover:border-foreground'
                  "
                />
                <p
                  v-if="attempted && errors.description"
                  id="edit-description-error"
                  class="font-medium text-danger"
                >
                  Error: {{ errors.description }}
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                <UiButton type="submit">Save changes</UiButton>
                <UiButton variant="secondary" @click="closeEditor">Cancel</UiButton>
              </div>
            </form>
          </section>
          <UiFeedback
            v-if="saved"
            class="mt-4"
            state="demo-save"
            title="Demo changes saved"
            description="Your changes are visible in this demo."
          />
        </div>
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
