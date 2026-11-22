export type DeliveryOutcome = 'accepted' | 'rejected' | 'unknown'
export type InvitationMessage = { to: string; role: string; link: string }

// Local Mailpit adapter. Hosted provider selection/configuration is a release input.
// The contract deliberately distinguishes provider acceptance from inbox delivery.
export async function sendLocalInvitation(
  endpoint: string,
  message: InvitationMessage,
  transport: typeof fetch = fetch,
): Promise<DeliveryOutcome> {
  try {
    const response = await transport(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: 'archive@example.test', Name: 'Clutterbase' },
        To: [{ Email: message.to }],
        Subject: 'Your invitation to Clutterbase',
        Text: `You have been invited as ${message.role}. Sign in with this email address, then choose Accept invitation. This invitation expires in seven days.\n\n${message.link}`,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return 'accepted'
    if (response.status >= 400 && response.status < 500 && response.status !== 408)
      return 'rejected'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function digestCredential(token: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export function createCredential(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
