<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ href: string; disabled?: boolean }>()
</script>

<template>
  <span v-if="disabled" aria-disabled="true" class="cursor-not-allowed text-muted line-through"
    ><slot
  /></span>
  <a
    v-else
    v-bind="$attrs"
    :href="href"
    class="rounded-sm font-medium text-accent underline decoration-2 underline-offset-4 hover:decoration-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    ><slot
  /></a>
</template>
