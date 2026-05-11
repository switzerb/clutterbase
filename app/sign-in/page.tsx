'use client'

import { useActionState, useState } from 'react'
import { signInWithPassword, signInWithMagicLink, type SignInState } from './actions'

export default function SignInPage() {
  const [mode, setMode] = useState<'magic-link' | 'password'>('magic-link')

  const [passwordState, passwordAction, passwordPending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    null
  )
  const [magicState, magicAction, magicPending] = useActionState<SignInState, FormData>(
    signInWithMagicLink,
    null
  )

  if (magicState?.sent) {
    return (
      <main>
        <p>Check your email for a sign-in link.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Sign in to Clutterbase</h1>

      <div>
        <button type="button" onClick={() => setMode('magic-link')}>
          Magic link
        </button>
        <button type="button" onClick={() => setMode('password')}>
          Password
        </button>
      </div>

      {mode === 'magic-link' ? (
        <form action={magicAction}>
          <label htmlFor="magic-email">Email</label>
          <input id="magic-email" name="email" type="email" required />
          {magicState?.error && <p role="alert">{magicState.error}</p>}
          <button type="submit" disabled={magicPending}>
            {magicPending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      ) : (
        <form action={passwordAction}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
          {passwordState?.error && <p role="alert">{passwordState.error}</p>}
          <button type="submit" disabled={passwordPending}>
            {passwordPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </main>
  )
}