import { requireAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { InviteForm } from './_components/InviteForm'
import { removeUser } from './actions'

export default async function AdminPage() {
  await requireAdmin()

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  const {
    data: { users },
  } = await service.auth.admin.listUsers()

  const sorted = [...users].sort((a, b) => {
    const aAdmin = a.app_metadata?.role === 'admin' ? 0 : 1
    const bAdmin = b.app_metadata?.role === 'admin' ? 0 : 1
    if (aAdmin !== bAdmin) return aAdmin - bAdmin
    return (a.email ?? '').localeCompare(b.email ?? '')
  })

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-semibold">Admin: User Management</h1>

      <InviteForm />

      <div className="w-full flex flex-col gap-3">
        <h2 className="font-semibold">Users ({users.length})</h2>
        <div className="rounded-[var(--radius)] border border-[var(--border)] divide-y divide-[var(--border)]">
          {sorted.map(user => (
            <div key={user.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email ?? '(no email)'}</p>
                <p className="text-xs text-[var(--muted)]">
                  {user.app_metadata?.role === 'admin' ? 'admin' : 'member'}
                  {!user.email_confirmed_at && ' · invite pending'}
                </p>
              </div>
              {user.id === currentUser?.id ? (
                <span className="text-xs text-[var(--muted)]">you</span>
              ) : (
                <form action={removeUser.bind(null, user.id)}>
                  <button type="submit" className="text-xs text-[var(--danger)] hover:underline">
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
