<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '../../src/components/ui/UiButton.vue'
import UiLink from '../../src/components/ui/UiLink.vue'
import UiInput from '../../src/components/ui/UiInput.vue'
import UiSelect from '../../src/components/ui/UiSelect.vue'
import UiDialog from '../../src/components/ui/UiDialog.vue'

const sort = ref('new')
const clicks = ref(0)
</script>

<template>
  <main class="mx-auto grid max-w-3xl gap-4 bg-canvas p-6 text-foreground">
    <h1 class="text-2xl font-semibold">Control verification fixture</h1>
    <div class="flex flex-wrap gap-4">
      <UiButton id="action" @click="clicks++">Save details</UiButton>
      <UiButton id="disabled-action" disabled @click="clicks++">Unavailable</UiButton>
      <UiLink href="/">Archive</UiLink>
      <UiLink href="/" disabled @click="clicks++">Unavailable link</UiLink>
      <output id="clicks">{{ clicks }}</output>
    </div>
    <UiInput id="normal" label="Title" hint="A descriptive title" />
    <UiInput id="invalid" label="Other title" error="Enter a title" />
    <UiInput id="disabled-field" label="Unavailable field" disabled />
    <UiSelect id="sort" v-model="sort" label="Sort">
      <option value="new">Newest</option>
      <option value="old">Oldest</option>
    </UiSelect>
    <UiSelect id="invalid-select" label="Other sort" error="Choose an order">
      <option>Choose</option>
    </UiSelect>
    <UiSelect id="disabled-select" label="Unavailable sort" disabled>
      <option>Unavailable</option>
    </UiSelect>
    <output id="selection">{{ sort }}</output>
    <UiDialog trigger="Open details" title="Details" description="Dialog keyboard verification.">
      <UiInput id="dialog-first" label="First field" />
      <UiButton id="dialog-second">Another action</UiButton>
    </UiDialog>
  </main>
</template>
