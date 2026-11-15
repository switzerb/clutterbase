<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import UiButton from './UiButton.vue'

defineProps<{ title: string; description: string; trigger: string; closeLabel?: string }>()
</script>

<template>
  <DialogRoot>
    <DialogTrigger as-child><UiButton>{{ trigger }}</UiButton></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-10 bg-overlay" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-20 max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 text-foreground shadow-xl"
      >
        <DialogTitle class="text-2xl font-semibold tracking-tight">{{ title }}</DialogTitle>
        <DialogDescription class="mt-3 text-muted">{{ description }}</DialogDescription>
        <div class="mt-6"><slot /></div>
        <DialogClose as-child
          ><UiButton class="mt-6" variant="secondary">{{
            closeLabel || 'Close'
          }}</UiButton></DialogClose
        >
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
