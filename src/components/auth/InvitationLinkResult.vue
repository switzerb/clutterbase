<script setup lang="ts">
import { onUnmounted, shallowRef } from 'vue'
import UiInput from '../ui/UiInput.vue'
import UiButton from '../ui/UiButton.vue'

const props = defineProps<{ link: string; email: string; expiresAt: string }>()
const copied = shallowRef('')
let active = true
onUnmounted(() => {
  active = false
})
async function copy() {
  try {
    await navigator.clipboard.writeText(props.link)
    if (active) copied.value = 'Link copied. Share it with the invited relative.'
  } catch {
    if (active) copied.value = 'Copy was unavailable. Select and copy the link below instead.'
  }
}
</script>
<template>
  <section
    class="mb-6 grid min-w-0 gap-3 rounded-lg border border-border p-4"
    aria-label="New invitation link"
  >
    <h2 class="text-2xl font-semibold">Share this invitation</h2>
    <p class="break-words">
      No email was sent. Share this link with {{ email }}. They must sign in with that email address
      and choose Accept invitation.
    </p>
    <p>
      Expires {{ new Date(expiresAt).toLocaleString() }}. Save the link now; it cannot be retrieved
      after you leave this page.
    </p>
    <UiInput
      label="Invitation link"
      :model-value="link"
      readonly
      autocomplete="off"
      spellcheck="false"
    />
    <UiButton @click="copy">Copy invitation link</UiButton>
    <p role="status">{{ copied }}</p>
  </section>
</template>
