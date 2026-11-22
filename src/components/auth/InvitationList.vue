<script setup lang="ts">
import type { Invitation } from '../../services/access-management'
import UiButton from '../ui/UiButton.vue'
defineProps<{ invitations: Invitation[]; disabled: boolean; deliveryMode: 'manual' | 'email' }>()
defineEmits<{ resend: [invitation: Invitation]; cancel: [invitation: Invitation] }>()
const delivery = {
  not_requested: 'Manual sharing · No email was sent. Sharing and receipt are not tracked.',
  accepted: 'Email provider accepted the message; inbox delivery is not confirmed.',
  rejected: 'Email delivery was rejected. Resend to issue a new invitation.',
  unknown: 'Email delivery is unknown. Refresh status or explicitly resend a new invitation.',
}
</script>
<template>
  <section class="mt-8">
    <h2 class="text-2xl font-semibold">Invitations</h2>
    <p v-if="!invitations.length" class="mt-3">No invitations yet.</p>
    <ul class="mt-4 grid gap-4">
      <li
        v-for="invitation in invitations"
        :key="invitation.id"
        class="min-w-0 rounded-lg border border-border p-4"
      >
        <h3 class="break-all font-semibold">{{ invitation.email }}</h3>
        <p>
          {{ invitation.role }} ·
          {{
            invitation.status === 'pending' && Date.parse(invitation.expiresAt) <= Date.now()
              ? 'expired'
              : invitation.status
          }}
        </p>
        <p>Expires {{ new Date(invitation.expiresAt).toLocaleString() }}</p>
        <p>{{ delivery[invitation.delivery] }}</p>
        <div v-if="invitation.status === 'pending'" class="mt-3 flex flex-wrap gap-3">
          <UiButton variant="secondary" :disabled="disabled" @click="$emit('resend', invitation)">{{
            deliveryMode === 'manual' ? 'Create replacement link' : 'Resend invitation'
          }}</UiButton>
          <UiButton variant="secondary" :disabled="disabled" @click="$emit('cancel', invitation)"
            >Cancel invitation</UiButton
          >
        </div>
      </li>
    </ul>
  </section>
</template>
