import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@heroui/react'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/storage'
import { TagSelector } from '@/app/_components/TagSelector'
import { RelatedItemPicker } from './_components/RelatedItemPicker'
import { removeRelatedItem, setItemTags } from './actions'

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

export default async function ItemPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [itemResult, itemTagsResult, categoriesResult, relationshipsResult] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, description, file_type, date_year, date_precision')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('item_tags').select('tag_id').eq('item_id', id),
    supabase.from('tag_categories').select('id, name, color, tags(id, name)').order('name'),
    supabase
      .from('item_relationships')
      .select('id, note, item_a:item_a_id(id, title, thumbnail_path), item_b:item_b_id(id, title, thumbnail_path)')
      .or(`item_a_id.eq.${id},item_b_id.eq.${id}`),
  ])

  if (!itemResult.data) notFound()

  const item = itemResult.data
  const selectedTagIds = (itemTagsResult.data ?? []).map(r => r.tag_id as string)
  const categories = (categoriesResult.data ?? []) as Category[]
  const rawRelationships = (relationshipsResult.data ?? []) as unknown as RelationshipRow[]

  // For each relationship, pull out the other item (not the current one).
  const relatedItems = rawRelationships.map(rel => {
    const other = rel.item_a?.id === id ? rel.item_b : rel.item_a
    return { relationshipId: rel.id, note: rel.note, item: other }
  }).filter((r): r is { relationshipId: string; note: string | null; item: RelatedItem } =>
    r.item !== null,
  )

  // Generate signed thumbnail URLs for related items.
  const thumbnailUrls: Record<string, string> = {}
  await Promise.all(
    relatedItems
      .filter(r => r.item.thumbnail_path)
      .map(async r => {
        try {
          thumbnailUrls[r.item.id] = await getSignedUrl('thumbnails', r.item.thumbnail_path!)
        } catch {
          // item displays without thumbnail
        }
      }),
  )

  // Applied tags grouped by category (display section).
  const appliedByCategory = categories
    .map(cat => ({
      ...cat,
      tags: cat.tags.filter(t => selectedTagIds.includes(t.id)),
    }))
    .filter(cat => cat.tags.length > 0)

  const setTags = setItemTags.bind(null, id)
  const relatedItemIds = relatedItems.map(r => r.item.id)

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 p-8 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        {item.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
        )}
        {item.date_year && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {item.date_precision === 'decade' ? `${item.date_year}s` : item.date_year}
          </p>
        )}
      </div>

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
