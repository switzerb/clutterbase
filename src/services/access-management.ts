import { getSupabase, invokeOperation, OperationError } from './supabase'

export interface Invitation {
  id: string
  archiveId: string
  email: string
  role: 'owner' | 'contributor'
  expiresAt: string
  status: 'pending' | 'accepted' | 'canceled' | 'replaced'
  delivery: 'accepted' | 'rejected' | 'unknown' | 'not_requested'
  deliveryMode: 'manual' | 'email'
}
export interface Member {
  user_id: string
  admission_email: string
  role: 'owner' | 'contributor'
  blocked: boolean
}
export type InvitationAction =
  | {
      action: 'create' | 'resend'
      archiveId: string
      email: string
      role: 'owner' | 'contributor'
      retryId: string
      replacesId?: string
    }
  | { action: 'cancel'; archiveId: string; invitationId: string }
export const accessGateway = {
  async list(this: void, archiveId: string) {
    const invitations = await invokeOperation<{
      invitations: Invitation[]
      deliveryMode: 'manual' | 'email'
    }>('archive-invitations', { action: 'list', archiveId })
    const { data, error } = await getSupabase()
      .from('archive_memberships')
      .select('user_id,admission_email,role,blocked')
      .eq('archive_id', archiveId)
      .order('admission_email')
    if (error) throw new OperationError('unconfirmed')
    return {
      invitations: invitations.invitations,
      members: data as Member[],
      deliveryMode: invitations.deliveryMode,
    }
  },
  invite(this: void, action: InvitationAction) {
    return invokeOperation<{ invitation: Invitation; link?: string }>('archive-invitations', action)
  },
  block(this: void, archiveId: string, userId: string, blocked: boolean) {
    return invokeOperation<{ outcome: string }>('contributor-access', {
      archiveId,
      userId,
      blocked,
    })
  },
}
