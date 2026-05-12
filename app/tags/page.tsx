import { requireAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  renameCategory,
  renameTag,
} from './actions'

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
            {/* Category header */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold capitalize">{category.name}</h2>
              <form action={deleteCategory.bind(null, category.id)}>
                <button type="submit" className="text-xs text-[var(--danger)] hover:underline">
                  Delete category
                </button>
              </form>
            </div>

            {/* Rename category */}
            <details>
              <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                Rename category…
              </summary>
              <form
                action={renameCategory.bind(null, category.id)}
                className="mt-2 flex gap-2"
              >
                <input
                  name="name"
                  required
                  defaultValue={category.name}
                  className={inputCls}
                />
                <button type="submit" className={btnCls}>
                  Save
                </button>
              </form>
            </details>

            {/* Tags list */}
            {category.tags.length > 0 ? (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {category.tags.map(tag => (
                  <li key={tag.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">{tag.name}</span>
                      <form action={deleteTag.bind(null, tag.id)}>
                        <button
                          type="submit"
                          className="text-xs text-[var(--danger)] hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                    <details>
                      <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                        Rename…
                      </summary>
                      <form
                        action={renameTag.bind(null, tag.id)}
                        className="mt-1 flex gap-2"
                      >
                        <input
                          name="name"
                          required
                          defaultValue={tag.name}
                          className={inputCls}
                        />
                        <button type="submit" className={btnCls}>
                          Save
                        </button>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">No tags yet.</p>
            )}

            {/* Add tag */}
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

      {/* Add category */}
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
