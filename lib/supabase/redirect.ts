// Auth redirects must stay inside this app, even for malformed URL input.
export function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return '/'
  }
  const base = 'https://clutterbase.invalid'
  const url = new URL(value, base)
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : '/'
}
