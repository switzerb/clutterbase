export function safeDestination(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return '/'
  let decoded = value
  try {
    for (let depth = 0; depth < 6; depth++) {
      if (
        !decoded.startsWith('/') ||
        decoded.startsWith('//') ||
        decoded.includes('\\') ||
        decoded.split('').some((character) => character.charCodeAt(0) < 32)
      )
        return '/'
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    if (/%[0-9a-f]{2}/i.test(decoded)) return '/'
    const target = new URL(decoded, 'https://clutterbase.invalid')
    if (target.origin !== 'https://clutterbase.invalid') return '/'
    if (
      !/^\/(?:$|archive\/[^/]+\/?$|inbox\/?$|family\/?$|upload\/?$|access\/?$|invitation\/?$)/.test(
        target.pathname,
      )
    )
      return '/'
    return value
  } catch {
    return '/'
  }
}

const key = 'clutterbase-return'
export function saveDestination(value: unknown) {
  try {
    sessionStorage.setItem(key, safeDestination(value))
  } catch {
    /* navigation can still use its query */
  }
}
export function readDestination() {
  try {
    return safeDestination(sessionStorage.getItem(key))
  } catch {
    return '/'
  }
}
export function clearDestination() {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* memory/route state still clears */
  }
}
