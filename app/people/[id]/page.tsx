import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@heroui/react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
import {
  setPersonParents,
  createFamilyUnitAsParent,
  addChildToUnit,
  removeChildFromUnit,
  deleteFamilyUnit,
  deletePerson,
} from '../actions'

type Params = Promise<{ id: string }>

type PersonRef = { id: string; full_name: string }

export default async function PersonPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const [personResult, childOfResult, parentOfResult, itemPeopleResult, allPeopleResult] =
    await Promise.all([
      supabase.from('people').select('*').eq('id', id).single(),
      supabase
        .from('family_unit_children')
        .select('family_unit_id, family_units ( id, parent1:parent_1_id ( id, full_name ), parent2:parent_2_id ( id, full_name ) )')
        .eq('person_id', id)
        .maybeSingle(),
      supabase
        .from('family_units')
        .select('id, parent1:parent_1_id ( id, full_name ), parent2:parent_2_id ( id, full_name ), family_unit_children ( person:person_id ( id, full_name ) )')
        .or(`parent_1_id.eq.${id},parent_2_id.eq.${id}`),
      supabase
        .from('item_people')
        .select('items ( id, title, thumbnail_path, file_type )')
        .eq('person_id', id),
      supabase.from('people').select('id, full_name').order('full_name').neq('id', id),
    ])

  if (personResult.error || !personResult.data) notFound()

  const person = personResult.data as {
    id: string
    full_name: string
    birth_year: number | null
    death_year: number | null
    notes: string | null
    profile_photo_item_id: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childOf = childOfResult.data as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentOf = (parentOfResult.data ?? []) as any[]
  const linkedItems = (itemPeopleResult.data ?? [])
    .map((r: { items: unknown }) => r.items)
    .filter(Boolean) as {
    id: string
    title: string
    thumbnail_path: string | null
    file_type: string
  }[]
  const allPeople = (allPeopleResult.data ?? []) as PersonRef[]

  // Generate signed URLs for linked item thumbnails
  const thumbnailUrls: Record<string, string> = {}
  await Promise.all(
    linkedItems
      .filter(item => item.thumbnail_path)
      .map(async item => {
        try {
          thumbnailUrls[item.id] = await getSignedUrl('thumbnails', item.thumbnail_path!)
        } catch {
          // skip — item displays without thumbnail
        }
      }),
  )

  // Profile photo
  let avatarUrl: string | null = null
  if (person.profile_photo_item_id) {
    const { data: photoItem } = await supabase
      .from('items')
      .select('thumbnail_path')
      .eq('id', person.profile_photo_item_id)
      .single()
    if (photoItem?.thumbnail_path) {
      try {
        avatarUrl = await getSignedUrl('thumbnails', photoItem.thumbnail_path)
      } catch {
        // skip
      }
    }
  }

  const parentUnit = childOf?.family_units ?? null
  const parentUnitId: string | null = childOf?.family_unit_id ?? null

  return (
    <main className="flex min-h-screen flex-col items-start gap-6 p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={person.full_name}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--default)] text-2xl font-medium text-[var(--default-foreground)]">
              {person.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{person.full_name}</h1>
            {(person.birth_year || person.death_year) && (
              <p className="text-sm text-[var(--muted)]">
                {person.birth_year ?? '?'} – {person.death_year ?? 'present'}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/people/${id}/edit`}
            className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
          >
            Edit
          </Link>
          <form action={deletePerson.bind(null, id)}>
            <button
              type="submit"
              className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--default)]"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {person.notes && (
        <Card className="w-full">
          <Card.Content>
            <p className="whitespace-pre-wrap text-sm">{person.notes}</p>
          </Card.Content>
        </Card>
      )}

      {/* Family tree */}
      <section className="flex w-full flex-col gap-4">
        <h2 className="text-lg font-semibold">Family tree</h2>

        {/* Parents */}
        <Card className="w-full">
          <Card.Header>
            <Card.Title className="text-base">Parents</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            {parentUnit ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-4 text-sm">
                  <span className="text-[var(--muted)]">Parent 1:</span>
                  {parentUnit.parent1 ? (
                    <Link href={`/people/${parentUnit.parent1.id}`} className="font-medium hover:underline">
                      {parentUnit.parent1.full_name}
                    </Link>
                  ) : (
                    <span className="text-[var(--muted)]">Unknown</span>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-[var(--muted)]">Parent 2:</span>
                  {parentUnit.parent2 ? (
                    <Link href={`/people/${parentUnit.parent2.id}`} className="font-medium hover:underline">
                      {parentUnit.parent2.full_name}
                    </Link>
                  ) : (
                    <span className="text-[var(--muted)]">Unknown</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No parents recorded.</p>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                {parentUnit ? 'Update parents…' : 'Record parents…'}
              </summary>
              <form
                action={setPersonParents.bind(null, id)}
                className="mt-3 flex flex-col gap-3"
              >
                <PersonSelect name="parent1Id" label="Parent 1" people={allPeople} currentValue={parentUnit?.parent1?.id} />
                <PersonSelect name="parent2Id" label="Parent 2" people={allPeople} currentValue={parentUnit?.parent2?.id} />
                <button
                  type="submit"
                  className="self-start rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--default)]"
                >
                  Save parents
                </button>
              </form>
            </details>
          </Card.Content>
        </Card>

        {/* Children (family units where person is a parent) */}
        <Card className="w-full">
          <Card.Header className="flex flex-row items-center justify-between">
            <Card.Title className="text-base">Children</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            {parentOf.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No children recorded.</p>
            )}

            {parentOf.map((unit: {
              id: string
              parent1: PersonRef | null
              parent2: PersonRef | null
              family_unit_children: { person: PersonRef | null }[]
            }) => {
              const coParent = unit.parent1?.id === id ? unit.parent2 : unit.parent1
              const children = unit.family_unit_children
                .map(c => c.person)
                .filter(Boolean) as PersonRef[]

              return (
                <div key={unit.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--muted)]">
                      {coParent ? (
                        <>
                          with{' '}
                          <Link href={`/people/${coParent.id}`} className="font-medium hover:underline">
                            {coParent.full_name}
                          </Link>
                        </>
                      ) : (
                        'Single parent'
                      )}
                    </p>
                    <form action={deleteFamilyUnit.bind(null, id, unit.id)}>
                      <button type="submit" className="text-xs text-[var(--danger)] hover:underline">
                        Remove unit
                      </button>
                    </form>
                  </div>

                  {children.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {children.map(child => (
                        <li key={child.id} className="flex items-center justify-between text-sm">
                          <Link href={`/people/${child.id}`} className="hover:underline">
                            {child.full_name}
                          </Link>
                          <form action={removeChildFromUnit.bind(null, id, unit.id, child.id)}>
                            <button type="submit" className="text-xs text-[var(--muted)] hover:text-[var(--danger)]">
                              Remove
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">No children in this unit yet.</p>
                  )}

                  <details className="group">
                    <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                      Add child…
                    </summary>
                    <form
                      action={addChildToUnit.bind(null, id, unit.id)}
                      className="mt-2 flex gap-2"
                    >
                      <PersonSelect
                        name="childId"
                        label=""
                        people={allPeople.filter(
                          p => !children.some(c => c.id === p.id),
                        )}
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--default)]"
                      >
                        Add
                      </button>
                    </form>
                  </details>
                </div>
              )
            })}

            <details className="group">
              <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                New family unit…
              </summary>
              <form
                action={createFamilyUnitAsParent.bind(null, id)}
                className="mt-3 flex flex-col gap-3"
              >
                <PersonSelect name="coParentId" label="Co-parent (optional)" people={allPeople} />
                <button
                  type="submit"
                  className="self-start rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--default)]"
                >
                  Create unit
                </button>
              </form>
            </details>
          </Card.Content>
        </Card>
      </section>

      {/* Linked items */}
      {linkedItems.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <h2 className="text-lg font-semibold">Linked items ({linkedItems.length})</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {linkedItems.map(item => (
              <Link key={item.id} href={`/items/${item.id}`} className="group flex flex-col gap-1">
                <div className="aspect-square overflow-hidden rounded-lg bg-[var(--default)]">
                  {thumbnailUrls[item.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrls[item.id]}
                      alt={item.title}
                      className="size-full object-cover transition-opacity group-hover:opacity-90"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-2xl text-[var(--muted)]">
                      {item.file_type === 'document' ? '📄' : '📁'}
                    </div>
                  )}
                </div>
                <p className="truncate text-xs">{item.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {linkedItems.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No items linked to this person yet.</p>
      )}
    </main>
  )
}

function PersonSelect({
  name,
  label,
  people,
  currentValue,
}: {
  name: string
  label: string
  people: PersonRef[]
  currentValue?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-[var(--muted)]">{label}</label>}
      <select
        name={name}
        defaultValue={currentValue ?? ''}
        className="rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-2 py-1.5 text-sm text-[var(--field-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
      >
        <option value="">— None / unknown —</option>
        {people.map(p => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}
