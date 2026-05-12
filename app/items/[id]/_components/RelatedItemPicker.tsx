'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addRelatedItem } from '../actions'

type ItemResult = { id: string; title: string }

type Props = {
  currentItemId: string
  excludeIds: string[]
}

export function RelatedItemPicker({ currentItemId, excludeIds }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ItemResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<ItemResult | null>(null)

  async function search(q: string) {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const supabase = createClient()
    const allExclude = [currentItemId, ...excludeIds]

    let queryBuilder = supabase
      .from('items')
      .select('id, title')
      .ilike('title', `%${q.trim()}%`)
      .limit(8)

    for (const excludeId of allExclude) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data } = await queryBuilder
    setResults(data ?? [])
    setSearching(false)
  }

  function pick(item: ItemResult) {
    setSelected(item)
    setQuery('')
    setResults([])
  }

  function reset() {
    setSelected(null)
    setQuery('')
    setResults([])
  }

  const action = addRelatedItem.bind(null, currentItemId)

  const inputCls =
    'w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

  return (
    <form action={action} className="flex flex-col gap-3">
      {selected ? (
        <>
          <input type="hidden" name="related_item_id" value={selected.id} />
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
            <span className="text-sm font-medium">{selected.title}</span>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Change
            </button>
          </div>
          <input name="note" placeholder="Note (optional)…" className={inputCls} />
          <button
            type="submit"
            className="self-start rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
          >
            Link item
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Search items by title…"
            value={query}
            onChange={e => search(e.target.value)}
            className={inputCls}
          />
          {searching && (
            <p className="text-xs text-[var(--muted)] px-1">Searching…</p>
          )}
          {!searching && results.length > 0 && (
            <ul className="rounded-[var(--radius)] border border-[var(--border)] divide-y divide-[var(--border)]">
              {results.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)] transition-colors"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-xs text-[var(--muted)] px-1">No items found.</p>
          )}
        </div>
      )}
    </form>
  )
}
