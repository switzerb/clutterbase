'use client'

import { startTransition, useActionState, useRef, type ReactNode } from 'react'
import { unstable_rethrow } from 'next/navigation'
import type { ActionResult } from '@/lib/action-result'

type Props = {
  action: (formData: FormData) => Promise<ActionResult>
  children: ReactNode
  className?: string
}

export function ActionForm({ action, children, className }: Props) {
  const submitting = useRef(false)
  const [result, dispatch, pending] = useActionState(async (_previous: ActionResult, data: FormData) => {
    try {
      return await action(data)
    } catch (error) {
      unstable_rethrow(error)
      return { error: 'Could not confirm the save. Your entries are still here; please try again.' }
    } finally {
      submitting.current = false
    }
  }, undefined)

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        if (submitting.current) return
        submitting.current = true
        const data = new FormData(event.currentTarget)
        // Dispatch explicitly so failed saves do not reset uncontrolled fields.
        startTransition(() => dispatch(data))
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className={`min-w-0 border-0 p-0 ${className ?? ''}`}>
        {children}
      </fieldset>
      {pending && <p role="status" className="text-xs text-[var(--muted)]">Saving…</p>}
      {result?.error && <p role="alert" className="text-sm text-[var(--danger)]">{result.error}</p>}
      {result?.success && <p role="status" className="text-sm text-[var(--success)]">{result.success}</p>}
    </form>
  )
}
