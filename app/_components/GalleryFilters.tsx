'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }
type Person = { id: string; full_name: string }

type CurrentFilters = {
  q?: string
  tags?: string
  person?: string
  decade?: string
  type?: string
  sort?: string
  incomplete?: string
}

type Props = {
  categories: Category[]
  people: Person[]
  currentFilters: CurrentFilters
}

const DECADES = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]

const FILE_TYPES = [
  { value: null, label: 'All' },
  { value: 'photo', label: 'Photo' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
] as const

const selectCls =
  'w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

export function GalleryFilters({ categories, people, currentFilters }: Props) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(currentFilters.q ?? '')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchValue(currentFilters.q ?? '')
  }, [currentFilters.q])

  function buildUrl(overrides: Record<string, string | null>): string {
    const merged: Record<string, string | undefined> = { ...currentFilters }
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) delete merged[key]
      else merged[key] = value
    }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  function update(key: string, value: string | null) {
    router.push(buildUrl({ [key]: value }))
  }

  function handleSearchChange(value: string) {
    setSearchValue(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      update('q', value.trim() || null)
    }, 400)
  }

  const selectedTagIds = new Set(currentFilters.tags?.split(',').filter(Boolean) ?? [])

  function toggleTag(tagId: string) {
    const next = new Set(selectedTagIds)
    if (next.has(tagId)) next.delete(tagId)
    else next.add(tagId)
    update('tags', next.size > 0 ? Array.from(next).join(',') : null)
  }

  const currentDecade = currentFilters.decade ? parseInt(currentFilters.decade, 10) : null
  const currentType = currentFilters.type ?? null

  const hasFilters = !!(
    currentFilters.q ||
    currentFilters.tags ||
    currentFilters.person ||
    currentFilters.decade ||
    currentFilters.type ||
    currentFilters.incomplete ||
    (currentFilters.sort && currentFilters.sort !== 'upload_desc')
  )

  const pillBase =
    'rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer'
  const pillActive =
    'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]'
  const pillInactive =
    'border-[var(--border)] hover:bg-[var(--default)] text-[var(--foreground)]'

  return (
    <div className="flex flex-col gap-5">
      {/* Keyword search */}
      <input
        type="text"
        placeholder="Search…"
        value={searchValue}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearchValue('')
            router.push('/')
          }}
          className="text-xs text-left text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Clear all filters
        </button>
      )}

      {/* Sort */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Sort
        </span>
        <select
          value={currentFilters.sort ?? 'upload_desc'}
          onChange={e => update('sort', e.target.value)}
          className={selectCls}
        >
          <option value="upload_desc">Newest uploaded</option>
          <option value="upload_asc">Oldest uploaded</option>
          <option value="date_desc">Date — newest first</option>
          <option value="date_asc">Date — oldest first</option>
        </select>
      </div>

      {/* Incomplete items toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={currentFilters.incomplete === 'true'}
          onChange={e => update('incomplete', e.target.checked ? 'true' : null)}
          className="rounded border-[var(--border)]"
        />
        <span className="text-sm">Incomplete items only</span>
      </label>

      {/* File type */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Type
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FILE_TYPES.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => update('type', value)}
              className={`${pillBase} ${currentType === value ? pillActive : pillInactive}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Decade */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Decade
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DECADES.map(decade => (
            <button
              key={decade}
              type="button"
              onClick={() => update('decade', currentDecade === decade ? null : String(decade))}
              className={`${pillBase} ${currentDecade === decade ? pillActive : pillInactive}`}
            >
              {decade}s
            </button>
          ))}
        </div>
      </div>

      {/* People */}
      {people.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="person-filter"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            Person
          </label>
          <select
            id="person-filter"
            value={currentFilters.person ?? ''}
            onChange={e => update('person', e.target.value || null)}
            className={selectCls}
          >
            <option value="">All people</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tags grouped by category */}
      {categories.map(
        cat =>
          cat.tags.length > 0 && (
            <div key={cat.id} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {cat.name}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {cat.tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`${pillBase} ${selectedTagIds.has(tag.id) ? pillActive : pillInactive}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  )
}
