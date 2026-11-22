import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'
import { appPinia } from '../stores/collection-context'
import { authGateway } from '../services/auth'
import { accessGateway, type Invitation, type Member } from '../services/access-management'
import { OperationError } from '../services/supabase'

vi.mock('../services/access-management', () => ({
  accessGateway: {
    list: vi.fn<typeof accessGateway.list>(),
    invite: vi.fn<typeof accessGateway.invite>(),
    block: vi.fn<typeof accessGateway.block>(),
  },
}))
const invitation: Invitation = {
  id: 'invitation',
  archiveId: 'test-archive',
  email: 'invitee@example.test',
  role: 'contributor',
  expiresAt: '2030-01-01T00:00:00Z',
  status: 'pending',
  delivery: 'unknown',
}
const members: Member[] = [
  { user_id: 'owner', admission_email: 'owner@example.test', role: 'owner', blocked: false },
  {
    user_id: 'relative',
    admission_email: 'relative@example.test',
    role: 'contributor',
    blocked: false,
  },
]
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.mocked(authGateway.access).mockResolvedValue({
    id: 'test-archive',
    name: 'Test archive',
    role: 'owner',
  })
  vi.mocked(accessGateway.list)
    .mockReset()
    .mockResolvedValue({ invitations: [invitation], members })
  vi.mocked(accessGateway.invite).mockReset().mockResolvedValue({ invitation })
  vi.mocked(accessGateway.block).mockReset().mockResolvedValue({ outcome: 'confirmed' })
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/access')
  wrapper = mount(App, { global: { plugins: [router, appPinia] } })
  await flushPromises()
  return router
}
async function click(label: string) {
  await wrapper!
    .findAll('button')
    .find((button) => button.text() === label)!
    .trigger('click')
  await flushPromises()
}
async function send() {
  await wrapper!.get('input[type=email]').setValue('new@example.test')
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
}
describe('owner access controls', () => {
  it('defaults to Contributor and requires acknowledgement for Owner', async () => {
    await open()
    expect(wrapper!.get('select').element.value).toBe('contributor')
    await wrapper!.get('select').setValue('owner')
    expect(wrapper!.text()).toContain('block or restore contributor access')
    await send()
    expect(accessGateway.invite).not.toHaveBeenCalled()
    await wrapper!.get('input[type=checkbox]').setValue(true)
    await send()
    expect(accessGateway.invite).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', role: 'owner', archiveId: 'test-archive' }),
    )
  })
  it.each(['create', 'resend', 'cancel'])(
    'retries a lost %s response with the identical operation',
    async (action) => {
      await open()
      vi.mocked(accessGateway.invite).mockRejectedValueOnce(new OperationError('unconfirmed'))
      if (action === 'create') await send()
      else await click(action === 'resend' ? 'Resend invitation' : 'Cancel invitation')
      const original = vi.mocked(accessGateway.invite).mock.calls[0]![0]
      expect(original.action).toBe(action)
      expect(wrapper!.text()).toContain('could not be confirmed')
      await click('Refresh status')
      expect(accessGateway.invite).toHaveBeenCalledTimes(1)
      await click('Retry same operation')
      expect(accessGateway.invite).toHaveBeenNthCalledWith(2, original)
      expect('retryId' in original).toBe(action !== 'cancel')
    },
  )
  it.each(['accepted', 'rejected', 'unknown'] as const)(
    'shows honest %s delivery feedback',
    async (delivery) => {
      vi.mocked(accessGateway.invite).mockResolvedValue({ invitation: { ...invitation, delivery } })
      await open()
      await send()
      expect(wrapper!.text()).toContain(
        delivery === 'accepted'
          ? 'inbox delivery is not confirmed'
          : delivery === 'rejected'
            ? 'Email delivery was rejected'
            : 'Email delivery is unknown',
      )
    },
  )
  it('blocks and unblocks contributors without offering owner mutation controls', async () => {
    await open()
    const ownerRow = wrapper!
      .findAll('li')
      .find((row) => row.text().includes('owner@example.test'))!
    expect(ownerRow.find('button').exists()).toBe(false)
    vi.mocked(accessGateway.list).mockResolvedValue({
      invitations: [],
      members: members.map((member) => ({ ...member, blocked: member.role === 'contributor' })),
    })
    await click('Block contributor')
    expect(accessGateway.block).toHaveBeenCalledWith('test-archive', 'relative', true)
    expect(wrapper!.text()).toContain('Past contributions are preserved')
    await click('Unblock contributor')
    expect(accessGateway.block).toHaveBeenCalledWith('test-archive', 'relative', false)
  })
  it('retries a block using the original desired state', async () => {
    await open()
    vi.mocked(accessGateway.block).mockRejectedValueOnce(new OperationError('unconfirmed'))
    await click('Block contributor')
    await click('Retry same operation')
    expect(accessGateway.block).toHaveBeenNthCalledWith(2, 'test-archive', 'relative', true)
  })
  it('explains blocked-address conflicts', async () => {
    await open()
    vi.mocked(accessGateway.invite).mockRejectedValue(new OperationError('member_blocked'))
    await send()
    expect(wrapper!.text()).toContain('Unblock its contributor membership')
  })
  it('denies contributor direct navigation before fetching protected lists', async () => {
    vi.mocked(authGateway.access).mockResolvedValue({
      id: 'test-archive',
      name: 'Test archive',
      role: 'contributor',
    })
    const router = await open()
    expect(router.currentRoute.value.path).toBe('/no-access')
    expect(accessGateway.list).not.toHaveBeenCalled()
  })
  it('clears the owner screen when the server denies archive ownership', async () => {
    vi.mocked(accessGateway.list).mockRejectedValue(new OperationError('owner_required'))
    const router = await open()
    expect(router.currentRoute.value.path).toBe('/no-access')
    expect(wrapper!.text()).not.toContain(invitation.email)
  })
})
