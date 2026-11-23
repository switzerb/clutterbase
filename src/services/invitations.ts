import { invokeOperation } from './supabase'

export const invitationGateway = {
  accept(this: void, token: string) {
    return invokeOperation<{ outcome: string; archiveId?: string }>('archive-invitations', {
      action: 'accept',
      token,
    })
  },
}
