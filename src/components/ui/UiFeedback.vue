<script setup lang="ts">
// Keep a mounted panel and update its content when opting into live announcements.
// Actions belong in the actions slot using UiButton or UiLink, outside the live region.
withDefaults(
  defineProps<{
    state: 'loading' | 'empty' | 'error' | 'demo-save'
    title: string
    description: string
    announce?: boolean
  }>(),
  { announce: false },
)
</script>

<template>
  <div
    class="rounded-lg border bg-surface p-5 text-foreground"
    :class="
      state === 'error'
        ? 'border-danger'
        : state === 'demo-save'
          ? 'border-success'
          : 'border-border'
    "
  >
    <div :aria-live="announce ? 'polite' : undefined" :aria-atomic="announce ? 'true' : undefined">
      <div class="flex items-start gap-3">
        <span
          v-if="state === 'loading'"
          aria-hidden="true"
          class="mt-1 inline-block size-5 shrink-0 rounded-full border-2 border-info border-t-transparent motion-safe:animate-spin"
        />
        <div class="min-w-0">
          <p class="font-semibold">{{ title }}</p>
          <p class="mt-1">{{ description }}</p>
          <p v-if="state === 'demo-save'" class="mt-1">
            Demo changes are kept in memory only, reset on reload, and are not saved to an archive.
          </p>
        </div>
      </div>
    </div>
    <div v-if="$slots.actions" class="mt-4 flex flex-wrap items-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
