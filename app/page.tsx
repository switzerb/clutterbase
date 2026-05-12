import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getIsAdmin } from '@/lib/supabase/admin'
import { getSignedUrl } from '@/lib/storage'
import { signOut } from '@/app/auth/actions'
import { GalleryFilters } from './_components/GalleryFilters'

type SearchParams = Promise<{
  q?: string
  tags?: string
  person?: string
  decade?: string
  type?: string
  sort?: string
  incomplete?: string
}>

type ItemRow = {
  id: string
  title: string
  date_year: number | null
  date_precision: string | null
  file_type: string
  thumbnail_path: string | null
  created_at: string
  item_tags: { tag_id: string }[]
  item_people: { person_id: string }[]
}

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }
type Person = { id: string; full_name: string }

function filePlaceholder(fileType: string) {
  if (fileType === 'photo') return '🖼'
  if (fileType === 'document') return '📄'
  return '📁'
}

function formatDate(year: number, precision: string | null) {
  return precision === 'decade' ? `${year}s` : String(year)
}

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, tags, person, decade, type, sort, incomplete } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const selectedTagIds = tags ? tags.split(',').filter(Boolean) : []
  const selectedPersonId = person ?? null
  const selectedDecade = decade ? parseInt(decade, 10) : null
  const showIncomplete = incomplete === 'true'
  const selectedSort = sort ?? 'upload_desc'

  const [categoriesResult, peopleResult, isAdmin] = await Promise.all([
    supabase.from('tag_categories').select('id, name, color, tags(id, name)').order('name'),
    supabase.from('people').select('id, full_name').order('full_name'),
    getIsAdmin(),
  ])

  const categories = (categoriesResult.data ?? []) as Category[]
  const people = (peopleResult.data ?? []) as Person[]

  // Build a tag→category map to support OR-within/AND-across filtering
  const tagCategoryMap: Record<string, string> = {}
  for (const cat of categories) {
    for (const tag of cat.tags) {
      tagCategoryMap[tag.id] = cat.id
    }
  }

  const selectedTagsByCategory: Record<string, string[]> = {}
  for (const tagId of selectedTagIds) {
    const catId = tagCategoryMap[tagId]
    if (catId) {
      ;(selectedTagsByCategory[catId] ??= []).push(tagId)
    }
  }

  // Build items query with DB-level filters
  let query = supabase
    .from('items')
    .select(
      'id, title, date_year, date_precision, file_type, thumbnail_path, created_at, item_tags(tag_id), item_people(person_id)',
    )

  if (q?.trim()) {
    query = query.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`)
  }

  if (type && ['photo', 'document', 'other'].includes(type)) {
    query = query.eq('file_type', type)
  }

  if (selectedDecade && !isNaN(selectedDecade)) {
    query = query.gte('date_year', selectedDecade).lte('date_year', selectedDecade + 9)
  }

  switch (selectedSort) {
    case 'date_asc':
      query = query.order('date_year', { ascending: true, nullsFirst: false })
      break
    case 'date_desc':
      query = query.order('date_year', { ascending: false, nullsFirst: false })
      break
    case 'upload_asc':
      query = query.order('created_at', { ascending: true })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: rawItems } = await query
  let items: ItemRow[] = (rawItems as ItemRow[]) ?? []

  // JS-side filtering for tags (OR within category, AND across categories) and people
  if (Object.keys(selectedTagsByCategory).length > 0) {
    items = items.filter(item => {
      const itemTagIds = new Set(item.item_tags.map(t => t.tag_id))
      return Object.values(selectedTagsByCategory).every(catTagIds =>
        catTagIds.some(tagId => itemTagIds.has(tagId)),
      )
    })
  }

  if (selectedPersonId) {
    items = items.filter(item => item.item_people.some(p => p.person_id === selectedPersonId))
  }

  if (showIncomplete) {
    items = items.filter(
      item => !item.date_year && item.item_tags.length === 0 && item.item_people.length === 0,
    )
  }

  // Generate signed thumbnail URLs in parallel
  const thumbnailUrls: Record<string, string> = {}
  await Promise.all(
    items
      .filter(item => item.thumbnail_path)
      .map(item =>
        getSignedUrl('thumbnails', item.thumbnail_path!)
          .then(url => {
            thumbnailUrls[item.id] = url
          })
          .catch(() => {}),
      ),
  )

  const currentFilters = { q, tags, person, decade, type, sort, incomplete }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Filter sidebar */}
      <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
        <div className="sticky top-0 max-h-screen overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Clutterbase</h1>
            <Link
              href="/upload"
              className="text-xs rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 transition-colors hover:bg-[var(--default)]"
            >
              Upload
            </Link>
          </div>

          <GalleryFilters
            categories={categories}
            people={people}
            currentFilters={currentFilters}
          />

          <div className="flex flex-col gap-2 text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
            <Link href="/people" className="hover:text-[var(--foreground)] transition-colors">
              People →
            </Link>
            <Link href="/tags" className="hover:text-[var(--foreground)] transition-colors">
              Tags →
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-[var(--foreground)] transition-colors">
                Admin →
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="hover:text-[var(--foreground)] transition-colors text-left"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Gallery content */}
      <div className="flex-1 p-6">
        <p className="mb-4 text-sm text-[var(--muted)]">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No items match your search.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map(item => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className="group flex flex-col gap-1.5"
              >
                <div className="aspect-square overflow-hidden rounded-[var(--radius)] bg-[var(--default)]">
                  {thumbnailUrls[item.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrls[item.id]}
                      alt={item.title}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-3xl text-[var(--muted)]">
                      {filePlaceholder(item.file_type)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:underline">
                    {item.title}
                  </p>
                  {item.date_year && (
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(item.date_year, item.date_precision)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
