<script setup lang="ts">
import type { Member } from '../../services/access-management'
import UiButton from '../ui/UiButton.vue'
defineProps<{ members: Member[]; disabled: boolean }>()
defineEmits<{ block: [member: Member, blocked: boolean] }>()
</script>
<template>
  <section class="mt-8">
    <h2 class="text-2xl font-semibold">Archive members</h2>
    <p class="mt-3">
      Blocking a contributor stops archive access and preserves their past contributions. Unblocking
      restores access without another invitation.
    </p>
    <ul class="mt-4 grid gap-4">
      <li
        v-for="member in members"
        :key="member.user_id"
        class="min-w-0 rounded-lg border border-border p-4"
      >
        <h3 class="break-all font-semibold">{{ member.admission_email }}</h3>
        <p>{{ member.role }} · {{ member.blocked ? 'Blocked' : 'Active' }}</p>
        <UiButton
          v-if="member.role === 'contributor'"
          variant="secondary"
          class="mt-3"
          :disabled="disabled"
          @click="$emit('block', member, !member.blocked)"
          >{{ member.blocked ? 'Unblock contributor' : 'Block contributor' }}</UiButton
        >
      </li>
    </ul>
  </section>
</template>
