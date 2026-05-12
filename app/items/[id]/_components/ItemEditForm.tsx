'use client'

import { useActionState } from 'react'
import { updateItem } from '../actions'

type Props = {
  itemId: string
  currentTitle: string
  currentDescription: string | null
  currentDateYear: number | null
  currentDatePrecision: string | null
}

const inputCls =
  'w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

export function ItemEditForm({
  itemId,
  currentTitle,
  currentDescription,
  currentDateYear,
  currentDatePrecision,
}: Props) {
  const [state, action] = useActionState(updateItem.bind(null, itemId), null)

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted)]">Title</label>
        <input name="title" defaultValue={currentTitle} required className={inputCls} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted)]">Description</label>
        <textarea
          name="description"
          defaultValue={currentDescription ?? ''}
          rows={3}
          className={inputCls}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-[var(--muted)]">Year</label>
          <input
            name="date_year"
            type="number"
            defaultValue={currentDateYear ?? ''}
            min={1800}
            max={2100}
            placeholder="e.g. 1975"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Precision</label>
          <select
            name="date_precision"
            defaultValue={currentDatePrecision ?? 'year'}
            className={inputCls}
          >
            <option value="year">Year</option>
            <option value="decade">Decade</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="self-start rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
      >
        Save changes
      </button>
    </form>
  )
}
