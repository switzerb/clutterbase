<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import SignInForm from '../components/auth/SignInForm.vue'
import { saveDestination, safeDestination } from '../router/return-destination'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'
import { emailSignInEnabled } from '../services/auth-options'

const route = useRoute()
const router = useRouter()
const session = useSession(appPinia)
const emailEnabled = emailSignInEnabled()
const destination = safeDestination(route.query.returnTo)
saveDestination(destination)
async function authenticated() {
  await router.replace(
    destination === '/invitation' ? destination : session.admitted ? destination : '/no-access',
  )
}
</script>
<template>
  <section class="mx-auto max-w-md">
    <h1 tabindex="-1" class="text-3xl font-semibold">Sign in to Clutterbase</h1>
    <p class="mt-3 mb-6 text-muted">
      Your family's private archive.
      {{
        emailEnabled
          ? 'Use the email address on your invitation.'
          : 'Continue with Google using the email address on your invitation.'
      }}
    </p>
    <SignInForm @authenticated="authenticated" />
  </section>
</template>
