<script setup lang="ts">
withDefaults(
  defineProps<{ variant?: 'primary' | 'secondary'; type?: 'button' | 'submit' | 'reset' }>(),
  {
    variant: 'primary',
    type: 'button',
  },
)
</script>

<template>
  <button
    :type="type"
    class="inline-flex min-h-control cursor-pointer items-center justify-center rounded-lg border-2 px-5 py-2 font-medium underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface disabled:text-muted disabled:line-through"
    :class="
      variant === 'primary'
        ? 'border-accent bg-accent text-on-accent enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:hover:underline'
        : 'border-border bg-surface-raised text-foreground enabled:hover:border-foreground enabled:hover:underline'
    "
  >
    <slot />
  </button>
</template>
