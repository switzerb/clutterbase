'use client'

import { useState } from 'react'

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }

type Props = {
  categories: Category[]
  selectedTagIds: string[]
  action: (formData: FormData) => Promise<void>
}

export function TagSelector({ categories, selectedTagIds, action }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTagIds))
  const [filter, setFilter] = useState('')

  const q = filter.trim().toLowerCase()
  const visible = categories
    .map(cat => ({
      ...cat,
      tags: cat.tags.filter(t => !q || t.name.toLowerCase().includes(q)),
    }))
    .filter(cat => cat.tags.length > 0)

  function toggle(tagId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {Array.from(selected).map(tagId => (
        <input key={tagId} type="hidden" name="tag_id" value={tagId} />
      ))}

      <input
        type="text"
        placeholder="Filter tags…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
      />

      <div className="flex flex-col gap-4">
        {visible.map(category => (
          <div key={category.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {category.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {category.tags.map(tag => {
                const on = selected.has(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggle(tag.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      on
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]'
                        : 'border-[var(--border)] hover:bg-[var(--default)] text-[var(--foreground)]'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {visible.length === 0 && filter && (
          <p className="text-sm text-[var(--muted)]">No tags match that filter.</p>
        )}

        {visible.length === 0 && !filter && (
          <p className="text-sm text-[var(--muted)]">No tags available. An admin can add some at /tags.</p>
        )}
      </div>

      <button
        type="submit"
        className="self-start rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
      >
        Save tags
      </button>
    </form>
  )
}
