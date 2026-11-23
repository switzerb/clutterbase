<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue'
import UiInput from '../ui/UiInput.vue'
import UiButton from '../ui/UiButton.vue'
import { authGateway } from '../../services/auth'
import { emailSignInEnabled } from '../../services/auth-options'
import { OperationError } from '../../services/supabase'
import { useSession } from '../../stores/session'
import { appPinia } from '../../stores/collection-context'

const emit = defineEmits<{ authenticated: [] }>()
const session = useSession(appPinia)
const emailEnabled = emailSignInEnabled()
const email = shallowRef('')
const code = shallowRef('')
const sentTo = shallowRef('')
const pending = shallowRef(false)
const message = shallowRef('')
const uncertain = shallowRef(false)
const seconds = shallowRef(0)
let active = true
const timer = setInterval(() => {
  if (seconds.value > 0) seconds.value--
}, 1000)
onUnmounted(() => {
  active = false
  clearInterval(timer)
})
const busy = computed(() => pending.value || seconds.value > 0)
function explain(error: unknown) {
  const outcome = error instanceof OperationError ? error.outcome : 'unconfirmed'
  uncertain.value = outcome === 'unconfirmed'
  message.value =
    outcome === 'invalid_code'
      ? 'That code cannot be used. Try again or request a new code.'
      : outcome === 'rate_limited'
        ? 'Please wait before trying again.'
        : outcome === 'google_failed'
          ? emailEnabled
            ? 'Google sign-in did not finish. Try again or use an email code.'
            : 'Google sign-in did not finish. Try again.'
          : 'Sign-in could not be confirmed. Check your connection, then retry.'
  if (error instanceof OperationError && error.retryAfter) {
    message.value += ` Retry after ${error.retryAfter}.`
  }
}
async function requestCode() {
  if (pending.value || seconds.value) return
  pending.value = true
  try {
    const normalized = email.value.trim().toLowerCase()
    const result = await authGateway.requestCode(normalized)
    if (!active) return
    sentTo.value = normalized
    seconds.value = result.resendCooldown
    uncertain.value = false
    message.value = 'If this address is eligible, a sign-in code is on its way. Check your email.'
  } catch (error) {
    if (active) explain(error)
  } finally {
    if (active) pending.value = false
  }
}
async function finish() {
  await session.reconcile()
  if (!active) return
  if (session.status === 'error') throw new OperationError('unconfirmed')
  if (!session.identity) {
    message.value = 'No sign-in was confirmed. Enter your code again or request a new one.'
    return
  }
  uncertain.value = false
  emit('authenticated')
}
async function verify() {
  if (pending.value) return
  pending.value = true
  try {
    await authGateway.verifyCode(sentTo.value, code.value)
    if (active) await finish()
  } catch (error) {
    if (active) explain(error)
  } finally {
    if (active) pending.value = false
  }
}
async function retry() {
  pending.value = true
  try {
    await finish()
  } catch (error) {
    if (active) explain(error)
  } finally {
    if (active) pending.value = false
  }
}
async function google() {
  pending.value = true
  try {
    await authGateway.google()
  } catch (error) {
    if (active) explain(error)
  } finally {
    if (active) pending.value = false
  }
}
</script>

<template>
  <div class="grid gap-5">
    <form v-if="emailEnabled" class="grid gap-4" @submit.prevent="requestCode">
      <UiInput
        v-model="email"
        label="Email address"
        type="email"
        autocomplete="email"
        required
        :disabled="pending"
      />
      <UiButton type="submit" :disabled="busy">{{
        sentTo ? 'Send another code' : 'Send sign-in code'
      }}</UiButton>
      <p v-if="seconds" class="text-muted">
        Another code can be requested in {{ seconds }} seconds.
      </p>
    </form>
    <form v-if="sentTo" class="grid gap-4" @submit.prevent="verify">
      <UiInput
        v-model="code"
        label="Six-digit sign-in code"
        :hint="`Code sent to ${sentTo}`"
        inputmode="numeric"
        autocomplete="one-time-code"
        pattern="[0-9]{6}"
        minlength="6"
        maxlength="6"
        required
        :disabled="pending"
      />
      <UiButton type="submit" :disabled="pending">Sign in</UiButton>
    </form>
    <p role="status" aria-live="polite" class="break-words">{{ message }}</p>
    <UiButton v-if="uncertain" variant="secondary" :disabled="pending" @click="retry"
      >Retry sign-in check</UiButton
    >
    <UiButton variant="secondary" :disabled="pending" @click="google"
      >Continue with Google</UiButton
    >
  </div>
</template>
