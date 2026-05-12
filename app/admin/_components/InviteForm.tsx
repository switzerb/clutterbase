'use client'

import { useActionState } from 'react'
import { inviteUser, type AdminState } from '../actions'

const inputCls =
  'flex-1 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-1.5 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

const btnCls =
  'shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--default)] disabled:opacity-50'

export function InviteForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(inviteUser, null)

  return (
    <div className="w-full rounded-[var(--radius)] border border-[var(--border)] p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Invite user</h2>
      <form action={action} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="email@example.com"
          className={inputCls}
        />
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </form>
      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
    </div>
  )
}
