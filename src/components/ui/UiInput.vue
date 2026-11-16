<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  id?: string
  label: string
  modelValue?: string
  hint?: string
  error?: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
const attrs = useAttrs()
const generatedId = useId()
const fieldId = computed(() => props.id || generatedId)
const describedBy = () =>
  [
    attrs['aria-describedby'],
    props.hint && `${fieldId.value}-hint`,
    props.error && `${fieldId.value}-error`,
  ]
    .filter(Boolean)
    .join(' ') || undefined
</script>

<template>
  <div class="grid gap-2">
    <label :for="fieldId" class="font-medium">{{ label }}</label>
    <p v-if="hint" :id="`${fieldId}-hint`" class="text-muted">{{ hint }}</p>
    <input
      v-bind="$attrs"
      :id="fieldId"
      :value="modelValue"
      :aria-describedby="describedBy()"
      :aria-invalid="error ? 'true' : undefined"
      class="min-h-control w-full min-w-0 rounded-lg border-2 bg-surface-raised px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface"
      :class="
        error ? 'border-danger border-dashed' : 'border-border enabled:hover:border-foreground'
      "
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" :id="`${fieldId}-error`" class="font-medium text-danger">Error: {{ error }}</p>
  </div>
</template>
