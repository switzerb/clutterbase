<script setup lang="ts">
import { ref } from 'vue'
import UiStatus from '../components/ui/UiStatus.vue'

// These outcomes are fixed examples, never derived from or applied to selected files.
const examples = [
  { name: 'example-garden-photo.jpg', label: 'Simulated complete', tone: 'success' },
  { name: 'example-family-letter.pdf', label: 'Simulated failed', tone: 'danger' },
  { name: 'example-postcard.jpg', label: 'Simulated waiting', tone: 'warning' },
] as const
const selectedNames = ref<string[]>([])

function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement
  // Only filenames are displayed; file contents are never read or sent.
  selectedNames.value = Array.from(input.files ?? [], (file) => file.name)
}
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Upload files</h1>
  <p class="mt-3 text-muted">
    Demo only · Uploads are not connected. This screen does not transfer files or save anything to
    the archive.
  </p>
  <section
    class="mt-6 rounded-lg border border-border bg-surface p-5"
    aria-labelledby="selection-heading"
  >
    <h2 id="selection-heading" class="text-2xl font-semibold">Select local files</h2>
    <p id="selection-help" class="mt-2 text-muted">
      Selection only: filenames stay on this page. Files are not read or sent and are not saved.
    </p>
    <label for="upload-files" class="mt-4 block font-semibold">Choose files from your device</label>
    <input
      id="upload-files"
      type="file"
      multiple
      aria-describedby="selection-help"
      class="mt-2 block min-h-12 w-full max-w-full text-base file:mr-3 file:min-h-12 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-4 file:font-semibold file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      @change="selectFiles"
    />
    <div v-if="selectedNames.length" class="mt-4">
      <p class="font-semibold">Selected locally only — not uploaded</p>
      <ul class="mt-2 list-inside list-disc">
        <li v-for="(name, index) in selectedNames" :key="index" class="break-all">{{ name }}</li>
      </ul>
    </div>
  </section>
  <section class="mt-8" aria-labelledby="examples-heading">
    <h2 id="examples-heading" class="text-2xl font-semibold">Example file outcomes</h2>
    <p class="mt-2 text-muted">
      These independent statuses and filenames are simulated examples, not results for your selected
      files.
    </p>
    <ul class="mt-4 grid gap-3">
      <li
        v-for="example in examples"
        :key="example.name"
        class="min-w-0 rounded-lg border border-border bg-surface p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <span class="min-w-0 font-semibold break-all">{{ example.name }}</span>
          <UiStatus :label="example.label" :tone="example.tone" />
        </div>
      </li>
    </ul>
  </section>
</template>
