<script setup lang="ts">
import { shallowRef } from 'vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiButton from '../ui/UiButton.vue'
defineProps<{ disabled: boolean; deliveryMode: 'manual' | 'email' }>()
const emit = defineEmits<{ invite: [email: string, role: 'owner' | 'contributor'] }>()
const email = shallowRef('')
const role = shallowRef('contributor')
const confirmed = shallowRef(false)
function submit() {
  if (role.value === 'owner' && !confirmed.value) return
  emit('invite', email.value.trim().toLowerCase(), role.value === 'owner' ? 'owner' : 'contributor')
}
</script>
<template>
  <form class="grid max-w-lg gap-4" @submit.prevent="submit">
    <h2 class="text-2xl font-semibold">Invite a relative</h2>
    <UiInput
      v-model="email"
      label="Invitation email"
      type="email"
      autocomplete="email"
      required
      :disabled="disabled"
    />
    <UiSelect v-model="role" label="Archive role" :disabled="disabled">
      <option value="contributor">Contributor</option>
      <option value="owner">Owner</option>
    </UiSelect>
    <label
      v-if="role === 'owner'"
      class="flex items-start gap-3 rounded-lg border border-warning p-4"
    >
      <input v-model="confirmed" type="checkbox" required :disabled="disabled" class="mt-2" />
      <span
        >I understand that an Owner can invite others, including owners, and block or restore
        contributor access.</span
      >
    </label>
    <UiButton type="submit" :disabled="disabled || (role === 'owner' && !confirmed)">{{
      deliveryMode === 'manual' ? 'Create invitation link' : 'Send invitation'
    }}</UiButton>
  </form>
</template>
