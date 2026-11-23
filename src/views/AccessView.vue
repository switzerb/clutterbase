<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import InviteForm from '../components/auth/InviteForm.vue'
import InvitationList from '../components/auth/InvitationList.vue'
import MemberList from '../components/auth/MemberList.vue'
import InvitationLinkResult from '../components/auth/InvitationLinkResult.vue'
import UiButton from '../components/ui/UiButton.vue'
import {
  accessGateway,
  type InvitationAction,
  type Invitation,
  type Member,
} from '../services/access-management'
import { OperationError } from '../services/supabase'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'

const session = useSession(appPinia)
const router = useRouter()
const invitations = shallowRef<Invitation[]>([])
const members = shallowRef<Member[]>([])
const loading = shallowRef(false)
const ready = shallowRef(false)
const deliveryMode = shallowRef<'manual' | 'email'>('manual')
const linkResult = shallowRef<{ invitation: Invitation; link: string } | null>(null)
let expiryTimer: ReturnType<typeof setTimeout> | undefined
function clearLink() {
  linkResult.value = null
  clearTimeout(expiryTimer)
}
watch(
  [() => session.identity?.id, () => session.archive?.id, () => session.archive?.role],
  clearLink,
  { flush: 'sync' },
)
const message = shallowRef('')
type Operation =
  | { kind: 'invitation'; action: InvitationAction }
  | { kind: 'block'; archiveId: string; userId: string; blocked: boolean }
const retry = shallowRef<Operation | null>(null)
const disabled = computed(() => loading.value || Boolean(retry.value) || !ready.value)
let active = true
onUnmounted(() => {
  active = false
  clearLink()
})
const failures: Record<string, string> = {
  member_blocked:
    'This address is blocked. Unblock its contributor membership instead of inviting again.',
  membership_exists: 'This address already has a membership. Invitations cannot change its role.',
  invitation_exists: 'A pending invitation already exists. Refresh status to resend or cancel it.',
  invitation_not_pending: 'That invitation is no longer pending. Refresh status.',
  send_rate_limited: 'Too many invitations were created. Wait before creating another.',
  retry_conflict: 'This retry does not match the original request. Refresh status.',
  replacement_mismatch: 'The invitation changed. Refresh status before resending.',
  owner_protected: 'Owner memberships cannot be blocked.',
  membership_not_found: 'That membership is no longer available. Refresh status.',
  invitation_not_found: 'That invitation is no longer available. Refresh status.',
}
async function denial(error: unknown) {
  if (
    error instanceof OperationError &&
    ['owner_required', 'authentication_required'].includes(error.outcome)
  ) {
    invitations.value = []
    members.value = []
    ready.value = false
    clearLink()
    await session.refresh()
    if (active) await router.replace('/no-access')
    return true
  }
  return false
}
async function refresh() {
  if (loading.value || !session.archive) return
  loading.value = true
  try {
    const data = await accessGateway.list(session.archive.id)
    if (!active) return
    invitations.value = data.invitations
    members.value = data.members
    deliveryMode.value = data.deliveryMode
    const shown = linkResult.value
    if (
      shown &&
      !data.invitations.some(
        (invitation) =>
          invitation.id === shown.invitation.id &&
          invitation.status === 'pending' &&
          Date.parse(invitation.expiresAt) > Date.now(),
      )
    )
      clearLink()
    ready.value = true
  } catch (error) {
    if (!active) return
    ready.value = false
    clearLink()
    if (!(await denial(error)))
      message.value =
        'Access lists could not be confirmed. Check your connection and refresh status.'
  } finally {
    if (active) loading.value = false
  }
}
async function perform(operation: Operation) {
  if (loading.value) return
  const identityId = session.identity?.id
  const revision = session.revision
  loading.value = true
  clearLink()
  retry.value = operation
  try {
    if (operation.kind === 'invitation') {
      const result = await accessGateway.invite(operation.action)
      if (
        !active ||
        session.identity?.id !== identityId ||
        session.revision !== revision ||
        session.archive?.role !== 'owner'
      )
        return
      message.value =
        `Invitation ${result.invitation.status}. ` +
        (result.invitation.deliveryMode === 'manual'
          ? 'No email was sent. ' +
            (result.link
              ? 'Copy the new link below to share it yourself.'
              : 'The original link cannot be retrieved. For a pending invitation, choose Create replacement link to get a new one.')
          : result.invitation.delivery === 'accepted'
            ? 'Email provider accepted the message; inbox delivery is not confirmed.'
            : result.invitation.delivery === 'rejected'
              ? 'Email delivery was rejected. Use Resend invitation for a new link.'
              : 'Email delivery is unknown. Refresh status or explicitly resend a new link.')
      if (
        result.link &&
        result.invitation.deliveryMode === 'manual' &&
        result.invitation.status === 'pending' &&
        Date.parse(result.invitation.expiresAt) > Date.now()
      ) {
        linkResult.value = { invitation: result.invitation, link: result.link }
        expiryTimer = setTimeout(clearLink, Date.parse(result.invitation.expiresAt) - Date.now())
      }
    } else {
      await accessGateway.block(operation.archiveId, operation.userId, operation.blocked)
      if (!active) return
      message.value = operation.blocked
        ? 'Contributor blocked. Past contributions are preserved.'
        : 'Contributor access restored.'
    }
    retry.value = null
  } catch (error) {
    if (!active) return
    if (await denial(error)) return
    const outcome = error instanceof OperationError ? error.outcome : 'unconfirmed'
    if (failures[outcome]) {
      retry.value = null
      message.value = failures[outcome]
    } else {
      message.value =
        'The operation could not be confirmed. Refresh status or retry the same operation; retry will not create another link or send another invitation.'
    }
  } finally {
    if (active) loading.value = false
  }
  if (active) await refresh()
}
function invite(email: string, role: 'owner' | 'contributor') {
  if (!session.archive || disabled.value) return
  void perform({
    kind: 'invitation',
    action: {
      action: 'create',
      archiveId: session.archive.id,
      email,
      role,
      retryId: crypto.randomUUID(),
    },
  })
}
function resend(invitation: Invitation) {
  if (disabled.value) return
  void perform({
    kind: 'invitation',
    action: {
      action: 'resend',
      archiveId: invitation.archiveId,
      email: invitation.email,
      role: invitation.role,
      replacesId: invitation.id,
      retryId: crypto.randomUUID(),
    },
  })
}
function cancel(invitation: Invitation) {
  if (disabled.value) return
  void perform({
    kind: 'invitation',
    action: { action: 'cancel', archiveId: invitation.archiveId, invitationId: invitation.id },
  })
}
function block(member: Member, blocked: boolean) {
  if (!session.archive || disabled.value) return
  void perform({ kind: 'block', archiveId: session.archive.id, userId: member.user_id, blocked })
}
onMounted(() => {
  void refresh()
})
</script>
<template>
  <h1 tabindex="-1" class="text-3xl font-semibold">Manage archive access</h1>
  <p class="mt-3 mb-6">{{ session.archive?.name }}</p>
  <p role="status" class="mb-4">{{ message }}</p>
  <div class="mb-6 flex flex-wrap gap-3">
    <UiButton variant="secondary" :disabled="loading" @click="refresh">Refresh status</UiButton>
    <UiButton v-if="retry" :disabled="loading" @click="perform(retry)"
      >Retry same operation</UiButton
    >
  </div>
  <InvitationLinkResult
    v-if="linkResult"
    :key="linkResult.invitation.id"
    :link="linkResult.link"
    :email="linkResult.invitation.email"
    :expires-at="linkResult.invitation.expiresAt"
  />
  <InviteForm :disabled="disabled" :delivery-mode="deliveryMode" @invite="invite" />
  <p v-if="loading" role="status" class="mt-4">Checking access records…</p>
  <template v-if="ready">
    <InvitationList
      :invitations="invitations"
      :disabled="disabled"
      :delivery-mode="deliveryMode"
      @resend="resend"
      @cancel="cancel"
    />
    <MemberList :members="members" :disabled="disabled" @block="block" />
  </template>
</template>
