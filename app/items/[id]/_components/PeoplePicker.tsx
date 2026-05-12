'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addItemPerson } from '../actions'

type PersonResult = { id: string; full_name: string }

type Props = {
  itemId: string
  excludeIds: string[]
}

const inputCls =
  'w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

export function PeoplePicker({ itemId, excludeIds }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PersonResult | null>(null)

  async function search(q: string) {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const supabase = createClient()

    let queryBuilder = supabase
      .from('people')
      .select('id, full_name')
      .ilike('full_name', `%${q.trim()}%`)
      .limit(8)

    for (const id of excludeIds) {
      queryBuilder = queryBuilder.neq('id', id)
    }

    const { data } = await queryBuilder
    setResults(data ?? [])
    setSearching(false)
  }

  function pick(person: PersonResult) {
    setSelected(person)
    setQuery('')
    setResults([])
  }

  function reset() {
    setSelected(null)
    setQuery('')
    setResults([])
  }

  const action = addItemPerson.bind(null, itemId)

  return (
    <form action={action} className="flex flex-col gap-3">
      {selected ? (
        <>
          <input type="hidden" name="person_id" value={selected.id} />
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
            <span className="text-sm font-medium">{selected.full_name}</span>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Change
            </button>
          </div>
          <button
            type="submit"
            className="self-start rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
          >
            Link person
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Search people by name…"
            value={query}
            onChange={e => search(e.target.value)}
            className={inputCls}
          />
          {searching && <p className="text-xs text-[var(--muted)] px-1">Searching…</p>}
          {!searching && results.length > 0 && (
            <ul className="rounded-[var(--radius)] border border-[var(--border)] divide-y divide-[var(--border)]">
              {results.map(person => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => pick(person)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--default)] transition-colors"
                  >
                    {person.full_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="text-xs text-[var(--muted)] px-1">No people found.</p>
          )}
        </div>
      )}
    </form>
  )
}
