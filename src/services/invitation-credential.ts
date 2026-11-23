const key = 'clutterbase-invitation'
const lifetime = 30 * 60 * 1000
let memory: { token: string; expires: number } | null = null

export function clearInvitationCredential() {
  memory = null
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* memory-only browsers */
  }
}

export function invitationCredential(): string | null {
  try {
    const saved = sessionStorage.getItem(key)
    if (saved) memory = JSON.parse(saved)
  } catch {
    /* retain the in-memory copy */
  }
  if (
    !memory ||
    !/^[0-9a-f]{64}$/.test(memory.token) ||
    !Number.isFinite(memory.expires) ||
    memory.expires <= Date.now()
  ) {
    clearInvitationCredential()
    return null
  }
  return memory.token
}

export function captureInvitationCredential(fragment: string) {
  if (fragment) {
    clearInvitationCredential()
    const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token')
    if (token && /^[0-9a-f]{64}$/.test(token)) {
      memory = { token, expires: Date.now() + lifetime }
      try {
        sessionStorage.setItem(key, JSON.stringify(memory))
      } catch {
        /* memory-only continuation */
      }
    }
  }
  return invitationCredential()
}
