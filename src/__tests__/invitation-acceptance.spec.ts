import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { createAppRouter } from '../router'
import { appPinia } from '../stores/collection-context'
import { useSession } from '../stores/session'
import { authGateway } from '../services/auth'
import { invitationGateway } from '../services/invitations'
import { invitationCredential, clearInvitationCredential } from '../services/invitation-credential'
import { OperationError } from '../services/supabase'

vi.mock('../services/invitations', () => ({
  invitationGateway: { accept: vi.fn<typeof invitationGateway.accept>() },
}))
const token = 'a'.repeat(64)
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.mocked(invitationGateway.accept).mockReset()
  clearInvitationCredential()
})
afterEach(() => {
  wrapper?.unmount()
  clearInvitationCredential()
  sessionStorage.clear()
})
async function open() {
  const router = createAppRouter(createMemoryHistory())
  await router.push(`/invitation#token=${token}`)
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
describe('explicit invitation acceptance', () => {
  it('expires temporary credentials without extending their lifetime on reload', async () => {
    await open()
    const saved = sessionStorage.getItem('clutterbase-invitation')!
    expect(invitationCredential()).toBe(token)
    expect(sessionStorage.getItem('clutterbase-invitation')).toBe(saved)
    const record = JSON.parse(saved)
    sessionStorage.setItem(
      'clutterbase-invitation',
      JSON.stringify({ ...record, expires: Date.now() - 1 }),
    )
    expect(invitationCredential()).toBeNull()
    expect(sessionStorage.getItem('clutterbase-invitation')).toBeNull()
  })
  it('scrubs the credential and never accepts on navigation', async () => {
    const router = await open()
    expect(router.currentRoute.value.fullPath).toBe('/invitation')
    expect(invitationCredential()).toBe(token)
    expect(wrapper!.html()).not.toContain(token)
    expect(invitationGateway.accept).not.toHaveBeenCalled()
  })
  it('opens the archive only after explicit acceptance and live access verification', async () => {
    const router = await open()
    vi.mocked(invitationGateway.accept).mockResolvedValue({
      outcome: 'accepted',
      archiveId: 'test-archive',
    })
    await click('Accept invitation')
    expect(invitationGateway.accept).toHaveBeenCalledWith(token)
    expect(router.currentRoute.value.path).toBe('/')
    expect(invitationCredential()).toBeNull()
  })
  it('retains the invitation through wrong-account switching and email sign-in', async () => {
    await open()
    vi.mocked(invitationGateway.accept).mockResolvedValue({ outcome: 'wrong_account' })
    await click('Accept invitation')
    expect(wrapper!.text()).toContain('different email address')
    await click('Switch accounts')
    expect(invitationCredential()).toBe(token)
    await wrapper!.get('input[type=email]').setValue('invited@example.test')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(wrapper!.text()).toContain('Accept invitation')
    expect(invitationGateway.accept).toHaveBeenCalledTimes(1)
  })
  it('continues from Google without accepting', async () => {
    vi.mocked(authGateway.identity).mockResolvedValue(null)
    await useSession(appPinia).reconcile()
    const router = await open()
    await click('Continue with Google')
    vi.mocked(authGateway.identity).mockResolvedValue({
      id: 'test-member',
      email: 'invited@example.test',
    })
    await router.push('/auth/callback?code=callback')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/invitation')
    expect(wrapper!.text()).toContain('Accept invitation')
    expect(invitationGateway.accept).not.toHaveBeenCalled()
  })
  it('preserves explicit acceptance when canceled Google sign-in falls back to email', async () => {
    vi.mocked(authGateway.identity).mockResolvedValue(null)
    vi.mocked(authGateway.access).mockResolvedValue(null)
    await useSession(appPinia).reconcile()
    const router = await open()
    await click('Continue with Google')
    await router.push('/auth/callback?error=access_denied')
    await flushPromises()
    await wrapper!
      .findAll('a')
      .find((link) => link.text() === 'Use email sign-in')!
      .trigger('click')
    await flushPromises()
    await wrapper!.get('input[type=email]').setValue('invited@example.test')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    vi.mocked(authGateway.identity).mockResolvedValue({
      id: 'test-member',
      email: 'invited@example.test',
    })
    await wrapper!.get('input[autocomplete=one-time-code]').setValue('123456')
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/invitation')
    expect(invitationCredential()).toBe(token)
    expect(wrapper!.text()).toContain('Accept invitation')
    expect(invitationGateway.accept).not.toHaveBeenCalled()
    expect(useSession(appPinia).admitted).toBe(false)

    vi.mocked(invitationGateway.accept).mockResolvedValue({
      outcome: 'accepted',
      archiveId: 'test-archive',
    })
    vi.mocked(authGateway.access).mockResolvedValue({
      id: 'test-archive',
      name: 'Test archive',
      role: 'contributor',
    })
    await click('Accept invitation')
    expect(invitationGateway.accept).toHaveBeenCalledExactlyOnceWith(token)
    expect(router.currentRoute.value.path).toBe('/')
    expect(invitationCredential()).toBeNull()
  })
  it.each([
    'expired',
    'canceled',
    'replaced',
    'invalid_invitation',
    'member_blocked',
    'membership_exists',
    'no_access',
  ])('explains and clears terminal outcome %s', async (outcome) => {
    await open()
    vi.mocked(invitationGateway.accept).mockResolvedValue({ outcome })
    await click('Accept invitation')
    expect(invitationCredential()).toBeNull()
    expect(wrapper!.get('[role=status]').text()).not.toBe('')
    expect(wrapper!.text()).not.toContain('Acceptance could not be confirmed')
  })
  it.each(['already_accepted', 'member_blocked'])(
    'reconciles lost acceptance as %s',
    async (outcome) => {
      const router = await open()
      vi.mocked(invitationGateway.accept)
        .mockRejectedValueOnce(new OperationError('unconfirmed'))
        .mockResolvedValueOnce({ outcome, archiveId: 'test-archive' })
      await click('Accept invitation')
      expect(wrapper!.text()).toContain('Acceptance could not be confirmed')
      expect(invitationCredential()).toBe(token)
      await click('Accept invitation')
      expect(invitationGateway.accept).toHaveBeenNthCalledWith(2, token)
      expect(invitationCredential()).toBeNull()
      expect(router.currentRoute.value.path).toBe(
        outcome === 'already_accepted' ? '/' : '/invitation',
      )
    },
  )
})
