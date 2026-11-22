import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from '../App.vue'
import { createAppRouter } from '../router'
import { authGateway, type ArchiveAccess } from '../services/auth'
import { OperationError } from '../services/supabase'
import { useSession } from '../stores/session'
import { appPinia, useCollectionContext } from '../stores/collection-context'
import { safeDestination, saveDestination } from '../router/return-destination'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  sessionStorage.clear()
})
async function open(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  wrapper = mount(App, { attachTo: document.body, global: { plugins: [router, appPinia] } })
  await flushPromises()
  return router
}
async function signedOut() {
  vi.mocked(authGateway.identity).mockResolvedValue(null)
  await useSession(appPinia).reconcile()
}

describe('private navigation and sessions', () => {
  it('fails closed when a restored session expires', async () => {
    const router = await open('/')
    vi.mocked(authGateway.identity).mockResolvedValue(null)
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper!.find('nav').exists()).toBe(false)
    expect(useSession(appPinia).archive).toBeNull()
  })
  it('redirects signed-out deep links and never renders protected content', async () => {
    await signedOut()
    const router = await open('/archive/summer-letter')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.returnTo).toBe('/archive/summer-letter')
    expect(wrapper!.text()).toContain('Sign in to Clutterbase')
    expect(wrapper!.find('nav').exists()).toBe(false)
    expect(wrapper!.find('[data-archive-card]').exists()).toBe(false)
  })
  it('shows no-access for a memberless identity and distinguishes service failures', async () => {
    vi.mocked(authGateway.access).mockResolvedValue(null)
    const router = await open('/')
    expect(router.currentRoute.value.path).toBe('/no-access')
    expect(wrapper!.text()).toContain('No archive access')
    vi.mocked(authGateway.access).mockRejectedValue(new Error('offline'))
    await useSession(appPinia).refresh()
    await flushPromises()
    expect(wrapper!.text()).toContain('Could not check archive access')
    expect(wrapper!.text()).toContain('Check your connection')
  })
  it('clears collection state and denies Back after sign-out', async () => {
    const router = await open('/')
    await router.push('/family')
    useCollectionContext(appPinia).capture({
      url: '/',
      itemId: 'sample',
      originPosition: 1,
      x: 0,
      y: 5,
    })
    await useSession(appPinia).signOut()
    await flushPromises()
    expect(wrapper!.find('nav').exists()).toBe(false)
    expect(useCollectionContext(appPinia).captured).toBeNull()
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/login')
    router.back()
    await flushPromises()
    expect(wrapper!.find('nav').exists()).toBe(false)
  })
  it('does not restore access from a stale request after sign-out', async () => {
    let resolve!: (value: ArchiveAccess) => void
    vi.mocked(authGateway.access).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const session = useSession(createPinia())
    const loading = session.refresh()
    await flushPromises()
    expect(session.admitted).toBe(false)
    await session.signOut()
    resolve({ id: 'a', name: 'Archive', role: 'owner' })
    await loading
    expect(session.status).toBe('signed-out')
    expect(session.archive).toBeNull()
    session.$dispose()
  })
  it('rechecks membership on navigation and app resume', async () => {
    const router = await open('/')
    vi.mocked(authGateway.access).mockResolvedValue(null)
    await router.push('/family')
    expect(router.currentRoute.value.path).toBe('/no-access')
    vi.mocked(authGateway.access).mockResolvedValue({
      id: 'test-archive',
      name: 'Test archive',
      role: 'contributor',
    })
    await router.push('/')
    vi.mocked(authGateway.access).mockResolvedValue(null)
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(wrapper!.text()).toContain('No archive access')
    expect(wrapper!.find('nav').exists()).toBe(false)
  })
  it.each([
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2fevil.test',
    '/%252fevil.test',
    '%2F%2Fevil.test',
    '/auth/callback',
    '/login',
    '/%0a/evil',
  ])('rejects unsafe return %s', (input) => {
    expect(safeDestination(input)).toBe('/')
  })
  it('preserves valid collection and item destinations', () => {
    expect(safeDestination('/?q=family%20photos&sort=oldest')).toBe(
      '/?q=family%20photos&sort=oldest',
    )
    expect(safeDestination('/archive/summer-letter')).toBe('/archive/summer-letter')
  })
})

describe('sign-in experience', () => {
  it('requests and verifies a code and restores the deep link', async () => {
    await signedOut()
    const router = await open('/login?returnTo=/archive/summer-letter')
    await wrapper!.get('input[type=email]').setValue('relative@example.test')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(authGateway.requestCode).toHaveBeenCalledWith('relative@example.test')
    expect(wrapper!.text()).toContain('If this address is eligible')
    await wrapper!.get('input[autocomplete=one-time-code]').setValue('123456')
    vi.mocked(authGateway.identity).mockResolvedValue({
      id: 'test-member',
      email: 'relative@example.test',
    })
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(authGateway.verifyCode).toHaveBeenCalledWith('relative@example.test', '123456')
    expect(router.currentRoute.value.path).toBe('/archive/summer-letter')
  })
  it('keeps invalid-code errors distinct from uncertain network outcomes', async () => {
    await signedOut()
    await open('/login')
    await wrapper!.get('input[type=email]').setValue('relative@example.test')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    vi.mocked(authGateway.verifyCode).mockRejectedValueOnce(new OperationError('invalid_code'))
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(wrapper!.text()).toContain('That code cannot be used')
    vi.mocked(authGateway.verifyCode).mockRejectedValueOnce(new OperationError('unconfirmed'))
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    expect(wrapper!.text()).toContain('Sign-in could not be confirmed')
    await wrapper!
      .findAll('button')
      .find((button) => button.text() === 'Retry sign-in check')!
      .trigger('click')
    await flushPromises()
    expect(wrapper!.text()).toContain('No sign-in was confirmed')
    expect(authGateway.requestCode).toHaveBeenCalledTimes(1)
  })
  it('reconciles a lost response with an established session without another code', async () => {
    await signedOut()
    const router = await open('/login')
    await wrapper!.get('input[type=email]').setValue('relative@example.test')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    vi.mocked(authGateway.verifyCode).mockRejectedValueOnce(new OperationError('unconfirmed'))
    await wrapper!.findAll('form')[1]!.trigger('submit')
    await flushPromises()
    vi.mocked(authGateway.identity).mockResolvedValue({
      id: 'test-member',
      email: 'relative@example.test',
    })
    await wrapper!
      .findAll('button')
      .find((button) => button.text() === 'Retry sign-in check')!
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
    expect(authGateway.requestCode).toHaveBeenCalledTimes(1)
  })
  it('offers Google and handles its callback through current access checks', async () => {
    await signedOut()
    const router = await open('/login?returnTo=/family')
    await wrapper!
      .findAll('button')
      .find((button) => button.text() === 'Continue with Google')!
      .trigger('click')
    expect(authGateway.google).toHaveBeenCalledOnce()
    vi.mocked(authGateway.identity).mockResolvedValue({
      id: 'test-member',
      email: 'relative@example.test',
    })
    saveDestination('/family')
    await router.push('/auth/callback?code=one-use-code')
    await flushPromises()
    expect(authGateway.exchange).toHaveBeenCalledWith('one-use-code')
    expect(router.currentRoute.value.path).toBe('/family')
  })
  it('gives a recovery path for canceled Google sign-in', async () => {
    await signedOut()
    await open('/auth/callback?error=access_denied')
    expect(wrapper!.text()).toContain('Google sign-in could not be confirmed')
    expect(wrapper!.text()).toContain('Use email sign-in')
    expect(authGateway.exchange).not.toHaveBeenCalled()
  })
})
