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
  <main class="grid min-h-dvh place-items-center bg-slate-50 px-6 py-12 text-slate-900 antialiased">
    <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
      <p class="text-sm font-semibold tracking-wide text-teal-700">Clutterbase</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight">Hello, Clutterbase.</h1>
      <p class="mt-4 leading-relaxed text-slate-600">
        A small beginning, built with Vue, Reka UI, and Tailwind CSS.
      </p>

      <DialogRoot>
        <DialogTrigger
          class="mt-8 inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          Open dialog
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay class="fixed inset-0 z-10 bg-slate-950/50" />
          <DialogContent
            class="fixed top-1/2 left-1/2 z-20 max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-8 text-slate-900 shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          >
            <DialogTitle class="text-2xl font-semibold tracking-tight"
              >Hello from Reka UI</DialogTitle
            >
            <DialogDescription class="mt-3 leading-relaxed text-slate-600">
              Reka UI handles the dialog's accessibility and focus management. Tailwind CSS gives it
              its appearance. Press Escape or use the button below to close it.
            </DialogDescription>
            <DialogClose
              class="mt-6 inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
            >
              Close dialog
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </div>
  </main>
</template>
