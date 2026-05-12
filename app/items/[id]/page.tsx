import { notFound, redirect } from 'next/navigation'
import { Card } from '@heroui/react'
import { createClient } from '@/lib/supabase/server'
import { TagSelector } from '@/app/_components/TagSelector'
import { setItemTags } from './actions'

type Params = Promise<{ id: string }>

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }

export default async function ItemPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [itemResult, itemTagsResult, categoriesResult] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, description, file_type, date_year, date_precision')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('item_tags').select('tag_id').eq('item_id', id),
    supabase
      .from('tag_categories')
      .select('id, name, color, tags(id, name)')
      .order('name'),
  ])

  if (!itemResult.data) notFound()

  const item = itemResult.data
  const selectedTagIds = (itemTagsResult.data ?? []).map(r => r.tag_id as string)
  const categories = (categoriesResult.data ?? []) as Category[]

  // Applied tags grouped by category, for the read-only display section.
  const appliedByCategory = categories
    .map(cat => ({
      ...cat,
      tags: cat.tags.filter(t => selectedTagIds.includes(t.id)),
    }))
    .filter(cat => cat.tags.length > 0)

  const setTags = setItemTags.bind(null, id)

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

      {/* Applied tags — grouped by category (spec 7.4) */}
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

      {/* Tag editor (spec 7.3) */}
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
    </main>
  )
}
