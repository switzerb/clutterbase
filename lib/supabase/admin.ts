import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.app_metadata?.role === 'admin'
}

export async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.app_metadata?.organization_id ?? null
}

// Call at the top of any admin Server Component or Server Action.
// Redirects to / if the current user is not an admin.
export async function requireAdmin(): Promise<void> {
  if (!(await getIsAdmin())) {
    redirect('/')
  }
}