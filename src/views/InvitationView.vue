<script setup lang="ts">
import { shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import SignInForm from '../components/auth/SignInForm.vue'
import UiButton from '../components/ui/UiButton.vue'
import { invitationGateway } from '../services/invitations'
import { invitationCredential, clearInvitationCredential } from '../services/invitation-credential'
import { OperationError } from '../services/supabase'
import { saveDestination } from '../router/return-destination'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'

const router = useRouter()
const session = useSession(appPinia)
const available = shallowRef(Boolean(invitationCredential()))
const pending = shallowRef(false)
const message = shallowRef('')
saveDestination('/invitation')
const explanations: Record<string, string> = {
  wrong_account:
    'This invitation is for a different email address. Switch accounts to use the invited address.',
  verified_identity_required: 'Sign in with the invited email address before accepting.',
  expired: 'This invitation has expired. Ask an owner for a current invitation.',
  canceled: 'This invitation was canceled. Ask an owner for a current invitation.',
  replaced: 'This invitation was replaced. Open the newest invitation from your email.',
  invalid_invitation: 'This invitation cannot be used. Ask an owner for a current invitation.',
  member_blocked: 'Archive access is blocked. Ask an owner to restore your access.',
  membership_exists:
    'This account or address already has a membership. Ask an owner for help; its role has not changed.',
  no_access: 'Archive access is unavailable. Ask an owner for help.',
}
async function accept() {
  if (pending.value) return
  const token = invitationCredential()
  if (!token) {
    available.value = false
    return
  }
  pending.value = true
  try {
    const result = await invitationGateway.accept(token)
    if (['accepted', 'already_accepted'].includes(result.outcome)) {
      await session.reconcile()
      if (session.status === 'error') throw new OperationError('unconfirmed')
      clearInvitationCredential()
      available.value = false
      await router.replace(
        session.admitted && session.archive?.id === result.archiveId ? '/' : '/no-access',
      )
    } else {
      message.value =
        explanations[result.outcome] ??
        'Acceptance could not be confirmed. Retry to check the result.'
      if (
        result.outcome in explanations &&
        !['wrong_account', 'verified_identity_required'].includes(result.outcome)
      ) {
        clearInvitationCredential()
        available.value = false
      }
    }
  } catch {
    message.value =
      'Acceptance could not be confirmed. Check your connection and retry Accept invitation; it will not create a second membership.'
  } finally {
    pending.value = false
  }
}
async function switchAccount() {
  pending.value = true
  try {
    await session.signOut(true)
    saveDestination('/invitation')
    message.value = 'Sign in with the email address on your invitation.'
  } catch {
    message.value = 'Sign-out could not be confirmed. Retry switching accounts.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-lg">
    <h1 tabindex="-1" class="text-3xl font-semibold">Archive invitation</h1>
    <p class="mt-4 mb-6">
      Sign in with the invited email address, then choose Accept invitation to join the archive.
    </p>
    <p v-if="!available" class="mb-4">
      Open a current invitation from your email. Temporary invitation details expire after thirty
      minutes.
    </p>
    <template v-else-if="session.identity">
      <p class="mb-4 break-all">Signed in as {{ session.identity.email }}</p>
      <div class="flex flex-wrap gap-3">
        <UiButton :disabled="pending" @click="accept">Accept invitation</UiButton>
        <UiButton variant="secondary" :disabled="pending" @click="switchAccount"
          >Switch accounts</UiButton
        >
      </div>
    </template>
    <SignInForm
      v-else-if="available"
      @authenticated="message = 'Signed in. Choose Accept invitation to join.'"
    />
    <p role="status" class="mt-5">{{ message }}</p>
  </section>
</template>
