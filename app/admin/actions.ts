'use server'

import type { ActionResult } from '@/lib/action-result'
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

  if (!orgId) return { error: 'No organization assigned to your account.' }
  const service = createServiceClient()
  const { data: invited, error } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  })

  if (error) {
    return { error: 'Could not send invitation. The user may already exist.' }
  }

  if (invited.user && orgId) {
    const { error: assignmentError } = await service.auth.admin.updateUserById(invited.user.id, {
      app_metadata: { organization_id: orgId },
    })
    if (assignmentError) return { error: 'The invitation was sent, but family access could not be assigned. Ask an administrator to repair the account before sending another invitation.' }
  }

  revalidatePath('/admin')
  return { success: `Invitation sent to ${email}.` }
}

export async function removeUser(userId: string): Promise<ActionResult> {
  await requireAdmin()

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (currentUser?.id === userId) return { error: 'You cannot remove your own account.' }

  const service = createServiceClient()
  const { data: target, error: lookupError } = await service.auth.admin.getUserById(userId)
  if (lookupError || !currentUser?.app_metadata?.organization_id || target.user.app_metadata?.organization_id !== currentUser.app_metadata.organization_id) {
    return { error: 'This user is unavailable in your organization.' }
  }
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return { error: 'Could not remove the user. Please try again.' }
  revalidatePath('/admin')
  return { success: 'User removed.' }
}
