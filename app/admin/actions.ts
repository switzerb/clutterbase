'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAdmin, getOrgId } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export type AdminState = { error?: string; success?: string } | null

export async function inviteUser(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin()
  const email = formData.get('email') as string
  const [origin, orgId] = [(await headers()).get('origin'), await getOrgId()]

  const service = createServiceClient()
  const { data: invited, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  })

  if (error) {
    return { error: 'Could not send invitation. The user may already exist.' }
  }

  if (invited.user && orgId) {
    await service.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { organization_id: orgId },
    })
  }

  revalidatePath('/admin')
  return { success: `Invitation sent to ${email}.` }
}

export async function removeUser(userId: string): Promise<void> {
  await requireAdmin()

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (currentUser?.id === userId) return

  const service = createServiceClient()
  await service.auth.admin.deleteUser(userId)
  revalidatePath('/admin')
}
