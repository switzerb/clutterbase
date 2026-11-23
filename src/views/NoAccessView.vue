<script setup lang="ts">
import { useRouter } from 'vue-router'
import { shallowRef } from 'vue'
import UiButton from '../components/ui/UiButton.vue'
import { useSession } from '../stores/session'
import { appPinia } from '../stores/collection-context'
const session = useSession(appPinia)
const router = useRouter()
const message = shallowRef('')
async function retry() {
  await session.refresh()
  if (session.admitted) await router.replace('/')
  else if (session.status === 'signed-out') await router.replace('/login')
}
async function signOut() {
  try {
    await session.signOut()
    await router.replace('/login')
  } catch {
    message.value =
      'Signed-out views are protected. Server sign-out could not be confirmed; retry sign out.'
  }
}
</script>
<template>
  <section class="max-w-xl">
    <h1 tabindex="-1" class="text-3xl font-semibold">
      {{ session.status === 'error' ? 'Could not check archive access' : 'No archive access' }}
    </h1>
    <p class="mt-4" role="status">
      {{
        session.status === 'error'
          ? 'The service could not confirm your access. Check your connection and retry.'
          : 'This account has no active archive access. Open your invitation to accept it, or ask an archive owner for help.'
      }}
    </p>
    <p v-if="session.identity" class="mt-3 break-all">Signed in as {{ session.identity.email }}</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <UiButton @click="retry">Check access again</UiButton>
      <UiButton variant="secondary" @click="signOut">Sign out</UiButton>
    </div>
    <p role="status">{{ message }}</p>
  </section>
</template>
