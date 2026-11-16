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
</script>

<template>
  <main class="min-h-dvh bg-canvas px-5 py-8 text-foreground antialiased sm:px-8">
    <div class="mx-auto w-full max-w-2xl">
      <p class="text-2xl font-semibold tracking-tight text-accent">
        Clutterbase<span aria-hidden="true" class="text-focus">.</span>
      </p>
      <section class="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-8">
        <h1 class="text-3xl font-semibold tracking-tight">Family material, thoughtfully kept.</h1>
        <p class="mt-4 text-muted">
          A quiet place for photographs, letters, and the stories behind them.
        </p>
        <p class="mt-4 text-muted">
          This is a visual foundation preview. Archive browsing is coming next.
        </p>
        <figure class="mt-6">
          <img
            src="/theme-sample.svg"
            alt="Synthetic sample letter with a terracotta stamp and evergreen signature"
            width="480"
            height="160"
            class="h-auto w-full rounded-lg"
          />
          <figcaption class="mt-2 text-muted">
            Sample artwork keeps its original colors in either appearance.
          </figcaption>
        </figure>

        <DialogRoot>
          <DialogTrigger
            class="mt-6 inline-flex min-h-control cursor-pointer items-center justify-center rounded-lg bg-accent px-5 py-3 font-medium text-on-accent hover:bg-accent-hover"
          >
            Open dialog
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay class="fixed inset-0 z-10 bg-overlay" />
            <DialogContent
              class="fixed top-1/2 left-1/2 z-20 max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 text-foreground shadow-xl"
            >
              <DialogTitle class="text-2xl font-semibold tracking-tight"
                >Hello from Reka UI</DialogTitle
              >
              <DialogDescription class="mt-3 text-muted">
                Reka UI handles the dialog's accessibility and focus management. Tailwind CSS gives
                it its appearance. Press Escape or use the button below to close it.
              </DialogDescription>
              <DialogClose
                class="mt-6 inline-flex min-h-control cursor-pointer items-center justify-center rounded-lg bg-accent px-5 py-3 font-medium text-on-accent hover:bg-accent-hover"
              >
                Close dialog
              </DialogClose>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </section>
    </div>
  </main>
</template>
