import Link from 'next/link'
import { Card } from '@heroui/react'
import { createClient } from '@/lib/supabase/server'

type SearchParams = Promise<{ q?: string }>

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('people').select('id, full_name, birth_year, death_year').order('full_name')
  if (q?.trim()) {
    query = query.ilike('full_name', `%${q.trim()}%`)
  }
  const { data: people } = await query

  return (
    <main className="flex min-h-screen flex-col items-start gap-6 p-8 max-w-3xl mx-auto w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <Link
          href="/people/new"
          className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
        >
          Add person
        </Link>
      </div>

      <form method="get" className="w-full">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name…"
          className="w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-2 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
        />
      </form>

      {people?.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          {q ? 'No people match that search.' : 'No people yet. Add one to get started.'}
        </p>
      )}

      <ul className="flex w-full flex-col gap-2">
        {people?.map(person => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`}>
              <Card className="w-full transition-colors hover:bg-[var(--surface-secondary)]">
                <Card.Content className="flex items-center gap-4 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--default)] text-sm font-medium text-[var(--default-foreground)]">
                    {person.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{person.full_name}</p>
                    {(person.birth_year || person.death_year) && (
                      <p className="text-xs text-[var(--muted)]">
                        {person.birth_year ?? '?'} – {person.death_year ?? 'present'}
                      </p>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
