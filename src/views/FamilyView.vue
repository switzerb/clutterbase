<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '../components/ui/UiButton.vue'
import { displayTitle, findArchiveItem } from '../data/archive'

// Invented examples only; these associations are not connected person records.
const people = [
  {
    name: 'Mara',
    bio: 'Mara enjoys writing about summer adventures and quiet afternoons in the garden.',
    material: ['summer-letter', 'garden-afternoon'],
  },
  {
    name: 'Alex',
    bio: 'Alex likes tending garden paths and remembering afternoons spent outdoors.',
    material: ['garden-afternoon'],
  },
] as const
const selected = ref<(typeof people)[number]>(people[0])
const material = computed(() =>
  selected.value.material.map(findArchiveItem).filter((item) => item !== undefined),
)
</script>

<template>
  <h1 tabindex="-1" class="text-3xl font-semibold tracking-tight">Family</h1>
  <p class="mt-3 text-muted">
    Demo content · These people, biographies, and material associations are synthetic examples, not
    connected person records. Profile editing and saving are not available.
  </p>
  <div class="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <section aria-labelledby="people-heading">
      <h2 id="people-heading" class="text-2xl font-semibold">People</h2>
      <ul class="mt-4 grid gap-3">
        <li v-for="person in people" :key="person.name">
          <UiButton
            variant="secondary"
            class="w-full justify-start text-left aria-pressed:border-accent aria-pressed:underline"
            :aria-pressed="selected.name === person.name"
            @click="selected = person"
            >{{ person.name }}</UiButton
          >
        </li>
      </ul>
    </section>
    <section
      aria-labelledby="person-heading"
      class="min-w-0 rounded-lg border border-border bg-surface p-5"
    >
      <p class="text-muted">Selected person</p>
      <h2 id="person-heading" class="mt-1 text-2xl font-semibold">{{ selected.name }}</h2>
      <p class="mt-3">{{ selected.bio }}</p>
      <h3 class="mt-6 text-xl font-semibold">Associated demo material</h3>
      <ul class="mt-3 grid gap-3">
        <li v-for="item in material" :key="item.id">
          <RouterLink
            :to="{ name: 'item', params: { id: item.id } }"
            class="font-semibold text-accent break-all underline decoration-2 underline-offset-4 hover:decoration-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >{{ displayTitle(item) }}</RouterLink
          >
        </li>
      </ul>
    </section>
  </div>
</template>
