<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span
    class="inline-flex max-w-full items-center rounded-md border bg-surface-raised px-2 py-0.5 text-base font-medium break-words"
    :class="{
      'border-border text-foreground': tone === 'neutral',
      'border-info text-info': tone === 'info',
      'border-success text-success': tone === 'success',
      'border-warning text-warning': tone === 'warning',
      'border-danger text-danger': tone === 'danger',
    }"
    >{{ label }}</span
  >
</template>
