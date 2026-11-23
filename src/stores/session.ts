import { computed, onScopeDispose, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { authGateway, type ArchiveAccess, type Identity } from '../services/auth'
import { useCollectionContext } from './collection-context'
import { resetDemoArchive } from '../data/archive'
import { clearDestination } from '../router/return-destination'
import { clearInvitationCredential } from '../services/invitation-credential'

export const useSession = defineStore('session', () => {
  const status = shallowRef<
    'initializing' | 'checking' | 'signed-out' | 'admitted' | 'no-access' | 'error'
  >('initializing')
  const identity = shallowRef<Identity | null>(null)
  const archive = shallowRef<ArchiveAccess | null>(null)
  const revision = shallowRef(0)
  const context = useCollectionContext()
  let generation = 0
  let pending: Promise<void> | null = null
  let unsubscribe: (() => void) | undefined
  let locallySignedOut = false

  function clearPrivate() {
    archive.value = null
    revision.value++
    context.$reset()
    resetDemoArchive()
  }
  function invalidate(user: Identity | null) {
    generation++
    pending = null
    if (identity.value?.id !== user?.id || !user) clearPrivate()
    identity.value = user
    status.value = user ? 'checking' : 'signed-out'
  }
  async function refresh() {
    if (locallySignedOut) return
    if (!unsubscribe) {
      try {
        unsubscribe = authGateway.subscribe((user) => {
          if (locallySignedOut) return
          invalidate(user)
          if (user)
            queueMicrotask(() => {
              void refresh()
            })
        })
      } catch {
        clearPrivate()
        status.value = 'error'
        return
      }
    }
    if (!pending) {
      const version = ++generation
      status.value = 'checking'
      pending = (async () => {
        try {
          const user = await authGateway.identity()
          if (version !== generation) return
          if (user?.id !== identity.value?.id) clearPrivate()
          identity.value = user
          if (!user) {
            clearPrivate()
            status.value = 'signed-out'
            return
          }
          const access = await authGateway.access(user.id)
          if (version !== generation) return
          if (!access) {
            clearPrivate()
            status.value = 'no-access'
            return
          }
          archive.value = access
          status.value = 'admitted'
        } catch {
          if (version === generation) {
            clearPrivate()
            status.value = 'error'
          }
        } finally {
          if (version === generation) pending = null
        }
      })()
    }
    const current = pending
    await current
    if (pending && pending !== current) await pending
  }
  async function reconcile() {
    locallySignedOut = false
    await refresh()
  }
  async function signOut(preserveInvitation = false) {
    locallySignedOut = true
    invalidate(null)
    clearDestination()
    if (!preserveInvitation) clearInvitationCredential()
    await authGateway.signOut()
  }
  function denyAccess() {
    generation++
    pending = null
    clearPrivate()
    status.value = identity.value ? 'no-access' : 'signed-out'
  }
  onScopeDispose(() => {
    unsubscribe?.()
    generation++
  })
  return {
    status,
    identity,
    archive,
    revision,
    admitted: computed(() => status.value === 'admitted'),
    owner: computed(() => status.value === 'admitted' && archive.value?.role === 'owner'),
    refresh,
    reconcile,
    signOut,
    denyAccess,
  }
})
