<script setup lang="ts">
// Run vp dev and open /scripts/fixtures/feedback.html to inspect both system themes.
import { ref } from 'vue'
import UiButton from '../../src/components/ui/UiButton.vue'
import UiLink from '../../src/components/ui/UiLink.vue'
import UiFeedback from '../../src/components/ui/UiFeedback.vue'
import UiStatus from '../../src/components/ui/UiStatus.vue'

const retries = ref(0)
</script>

<template>
  <main class="mx-auto grid max-w-3xl gap-4 bg-canvas p-6 text-foreground">
    <h1 class="text-2xl font-semibold">Feedback verification fixture</h1>
    <div class="flex flex-wrap gap-2">
      <UiStatus data-tone="warning" label="Needs review" tone="warning" />
      <UiStatus data-tone="success" label="Reviewed" tone="success" />
      <UiStatus data-tone="info" label="Processing" tone="info" />
      <UiStatus data-tone="danger" label="Failed" tone="danger" />
      <UiStatus data-tone="neutral" label="Draft" />
    </div>
    <UiFeedback id="loading" state="loading" title="Loading examples" description="Please wait." />
    <UiFeedback state="empty" title="No examples yet" description="Visit the archive to explore.">
      <template #actions><UiLink href="/">Go to Archive</UiLink></template>
    </UiFeedback>
    <UiFeedback
      id="error"
      state="error"
      title="Could not load examples"
      :description="`Try again. Retry count: ${retries}.`"
      announce
    >
      <template #actions><UiButton id="retry" @click="retries++">Retry</UiButton></template>
    </UiFeedback>
    <UiFeedback
      id="demo-save"
      state="demo-save"
      title="Changes applied"
      description="Your example has been updated."
    />
  </main>
</template>
