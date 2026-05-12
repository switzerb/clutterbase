import { requireAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createCategory, createTag, deleteCategory, deleteTag } from './actions'

type Tag = { id: string; name: string }
type Category = { id: string; name: string; color: string | null; tags: Tag[] }

const inputCls =
  'flex-1 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--field-background)] px-3 py-1.5 text-sm text-[var(--field-foreground)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'

const btnCls =
  'shrink-0 rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--default)]'

export default async function TagsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: rawCategories } = await supabase
    .from('tag_categories')
    .select('id, name, color, tags(id, name)')
    .order('name')

  const categories = (rawCategories ?? []) as Category[]

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-semibold">Tag Management</h1>

      <div className="flex flex-col gap-4 w-full">
        {categories.map(category => (
          <div
            key={category.id}
            className="rounded-[var(--radius)] border border-[var(--border)] p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold capitalize">{category.name}</h2>
              <form action={deleteCategory.bind(null, category.id)}>
                <button
                  type="submit"
                  className="text-xs text-[var(--danger)] hover:underline"
                >
                  Delete category
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2 min-h-6">
              {category.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--default)] px-2.5 py-0.5 text-sm text-[var(--default-foreground)]"
                >
                  {tag.name}
                  <form action={deleteTag.bind(null, tag.id)} className="flex">
                    <button
                      type="submit"
                      aria-label={`Delete ${tag.name}`}
                      className="leading-none text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      ×
                    </button>
                  </form>
                </span>
              ))}
              {category.tags.length === 0 && (
                <span className="text-sm text-[var(--muted)]">No tags yet.</span>
              )}
            </div>

            <form action={createTag.bind(null, category.id)} className="flex gap-2">
              <input name="name" required placeholder="New tag…" className={inputCls} />
              <button type="submit" className={btnCls}>
                Add tag
              </button>
            </form>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No categories yet.</p>
        )}
      </div>

      <div className="w-full rounded-[var(--radius)] border border-[var(--border)] p-4">
        <h2 className="mb-3 font-semibold">Add category</h2>
        <form action={createCategory} className="flex gap-2">
          <input name="name" required placeholder="Category name…" className={inputCls} />
          <button type="submit" className={btnCls}>
            Add category
          </button>
        </form>
      </div>
    </main>
  )
}
