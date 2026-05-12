import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@heroui/react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
import { TagSelector } from '@/app/_components/TagSelector'
import { ItemEditForm } from './_components/ItemEditForm'
import { PeoplePicker } from './_components/PeoplePicker'
import { RelatedItemPicker } from './_components/RelatedItemPicker'
import { removeItemPerson, removeRelatedItem, setItemTags } from './actions'

type Params = Promise<{ id: string }>

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }
type RelatedItem = { id: string; title: string; thumbnail_path: string | null }
type RelationshipRow = {
  id: string
  note: string | null
  item_a: RelatedItem | null
  item_b: RelatedItem | null
}
type ItemPersonRow = {
  person_id: string
  people: { id: string; full_name: string } | null
}

export default async function ItemPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [itemResult, itemTagsResult, categoriesResult, relationshipsResult, itemPeopleResult] =
    await Promise.all([
      supabase
        .from('items')
        .select('id, title, description, file_type, file_path, date_year, date_precision')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('item_tags').select('tag_id').eq('item_id', id),
      supabase.from('tag_categories').select('id, name, color, tags(id, name)').order('name'),
      supabase
        .from('item_relationships')
        .select(
          'id, note, item_a:item_a_id(id, title, thumbnail_path), item_b:item_b_id(id, title, thumbnail_path)',
        )
        .or(`item_a_id.eq.${id},item_b_id.eq.${id}`),
      supabase
        .from('item_people')
        .select('person_id, people(id, full_name)')
        .eq('item_id', id),
    ])

  if (!itemResult.data) notFound()

  const item = itemResult.data
  const selectedTagIds = (itemTagsResult.data ?? []).map(r => r.tag_id as string)
  const categories = (categoriesResult.data ?? []) as Category[]
  const rawRelationships = (relationshipsResult.data ?? []) as unknown as RelationshipRow[]
  const linkedPeople = ((itemPeopleResult.data ?? []) as unknown as ItemPersonRow[])
    .map(r => r.people)
    .filter((p): p is { id: string; full_name: string } => p !== null)

  const relatedItems = rawRelationships
    .map(rel => {
      const other = rel.item_a?.id === id ? rel.item_b : rel.item_a
      return { relationshipId: rel.id, note: rel.note, item: other }
    })
    .filter(
      (r): r is { relationshipId: string; note: string | null; item: RelatedItem } =>
        r.item !== null,
    )

  // Generate signed URLs for the file and related item thumbnails in parallel
  let fileUrl: string | null = null
  const thumbnailUrls: Record<string, string> = {}

  await Promise.all([
    item.file_path
      ? getSignedUrl('originals', item.file_path)
          .then(url => {
            fileUrl = url
          })
          .catch(() => {})
      : Promise.resolve(),
    ...relatedItems
      .filter(r => r.item.thumbnail_path)
      .map(r =>
        getSignedUrl('thumbnails', r.item.thumbnail_path!)
          .then(url => {
            thumbnailUrls[r.item.id] = url
          })
          .catch(() => {}),
      ),
  ])

  const appliedByCategory = categories
    .map(cat => ({
      ...cat,
      tags: cat.tags.filter(t => selectedTagIds.includes(t.id)),
    }))
    .filter(cat => cat.tags.length > 0)

  const setTags = setItemTags.bind(null, id)
  const relatedItemIds = relatedItems.map(r => r.item.id)
  const linkedPersonIds = linkedPeople.map(p => p.id)

  const dateDisplay = item.date_year
    ? item.date_precision === 'decade'
      ? `${item.date_year}s`
      : String(item.date_year)
    : null

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 p-8 max-w-3xl mx-auto w-full">
      <Link
        href="/"
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        ← Gallery
      </Link>

      {/* File display */}
      {fileUrl && item.file_type === 'photo' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileUrl}
          alt={item.title}
          className="w-full rounded-[var(--radius)] object-contain max-h-[70vh] bg-[var(--default)]"
        />
      )}
      {fileUrl && item.file_type !== 'photo' && (
        <a
          href={fileUrl}
          download
          className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--default)]"
        >
          Download file
        </a>
      )}

      {/* Title and metadata */}
      <div>
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        {item.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
        )}
        {dateDisplay && <p className="mt-1 text-sm text-[var(--muted)]">{dateDisplay}</p>}
      </div>

      {/* Edit details */}
      <section className="w-full">
        <Card className="w-full">
          <Card.Header>
            <Card.Title className="text-base">Edit details</Card.Title>
          </Card.Header>
          <Card.Content>
            <ItemEditForm
              itemId={id}
              currentTitle={item.title}
              currentDescription={item.description ?? null}
              currentDateYear={item.date_year ?? null}
              currentDatePrecision={item.date_precision ?? null}
            />
          </Card.Content>
        </Card>
      </section>

      {/* People */}
      <section className="w-full flex flex-col gap-4">
        <h2 className="text-lg font-medium">People</h2>

        {linkedPeople.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {linkedPeople.map(person => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] p-3"
              >
                <Link
                  href={`/people/${person.id}`}
                  className="flex-1 text-sm font-medium hover:underline"
                >
                  {person.full_name}
                </Link>
                <form action={removeItemPerson.bind(null, id, person.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-[var(--danger)] hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No people linked yet.</p>
        )}

        <details>
          <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Add person…
          </summary>
          <div className="mt-3">
            <PeoplePicker itemId={id} excludeIds={linkedPersonIds} />
          </div>
        </details>
      </section>

      {/* Applied tags grouped by category */}
      {appliedByCategory.length > 0 && (
        <section className="w-full flex flex-col gap-3">
          <h2 className="text-lg font-medium">Tags</h2>
          {appliedByCategory.map(cat => (
            <div key={cat.id} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] w-16 shrink-0">
                {cat.name}
              </span>
              {cat.tags.map(tag => (
                <span
                  key={tag.id}
                  className="rounded-full bg-[var(--default)] px-2.5 py-0.5 text-sm text-[var(--default-foreground)]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Tag editor */}
      <section className="w-full">
        <Card className="w-full">
          <Card.Header>
            <Card.Title className="text-base">
              {appliedByCategory.length > 0 ? 'Edit tags' : 'Add tags'}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <TagSelector
              categories={categories}
              selectedTagIds={selectedTagIds}
              action={setTags}
            />
          </Card.Content>
        </Card>
      </section>

      {/* Related items */}
      <section className="w-full flex flex-col gap-4">
        <h2 className="text-lg font-medium">Related items</h2>

        {relatedItems.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {relatedItems.map(({ relationshipId, note, item: other }) => (
              <li
                key={relationshipId}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] p-3"
              >
                <Link href={`/items/${other.id}`} className="shrink-0">
                  <div className="size-12 overflow-hidden rounded-md bg-[var(--default)]">
                    {thumbnailUrls[other.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrls[other.id]}
                        alt={other.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-lg text-[var(--muted)]">
                        📁
                      </div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/items/${other.id}`} className="text-sm font-medium hover:underline">
                    {other.title}
                  </Link>
                  {note && <p className="text-xs text-[var(--muted)]">{note}</p>}
                </div>
                <form action={removeRelatedItem.bind(null, id, relationshipId)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-[var(--danger)] hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No related items yet.</p>
        )}

        <details>
          <summary className="cursor-pointer text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Add related item…
          </summary>
          <div className="mt-3">
            <RelatedItemPicker currentItemId={id} excludeIds={relatedItemIds} />
          </div>
        </details>
      </section>
    </main>
  )
}
