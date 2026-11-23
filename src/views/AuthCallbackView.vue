<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authGateway } from '../services/auth'
import { readDestination } from '../router/return-destination'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'
import UiButton from '../components/ui/UiButton.vue'
import { emailSignInEnabled } from '../services/auth-options'

const route = useRoute()
const router = useRouter()
const session = useSession(appPinia)
const emailEnabled = emailSignInEnabled()
const message = shallowRef('Finishing sign-in…')
const failed = shallowRef(false)
let active = true
onUnmounted(() => {
  active = false
})
async function finish(retry = false) {
  try {
    if (!retry) {
      if (route.query.error || typeof route.query.code !== 'string')
        throw new Error('google_failed')
      const code = route.query.code
      window.history.replaceState(window.history.state, '', '/auth/callback')
      await authGateway.exchange(code)
    }
    await session.reconcile()
    if (!active) return
    if (session.status === 'error') throw new Error('unconfirmed')
    if (!session.identity) throw new Error('google_failed')
    const destination = readDestination()
    await router.replace(
      destination === '/invitation' ? destination : session.admitted ? destination : '/no-access',
    )
  } catch {
    if (active) {
      failed.value = true
      message.value = emailEnabled
        ? 'Google sign-in could not be confirmed. Retry the session check or use email sign-in.'
        : 'Google sign-in could not be confirmed. Retry the session check or return to sign in with Google again.'
    }
  }
}
onMounted(() => {
  void finish()
})
</script>
<template>
  <section class="max-w-xl">
    <h1 tabindex="-1" class="text-3xl font-semibold">Finishing sign-in</h1>
    <p role="status" class="mt-4">{{ message }}</p>
    <div v-if="failed" class="mt-6 flex flex-wrap gap-3">
      <UiButton @click="finish(true)">Retry sign-in check</UiButton>
      <RouterLink
        :to="{ path: '/login', query: { returnTo: readDestination() } }"
        class="self-center text-accent underline"
        >{{ emailEnabled ? 'Use email sign-in' : 'Return to sign in' }}</RouterLink
      >
    </div>
  </section>
</template>
