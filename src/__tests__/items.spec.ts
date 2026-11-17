import { describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { archiveItems } from '../data/archive'
import { createAppRouter } from '../router'

async function open(path: string) {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('item pages', () => {
  it('shows the photo, established details, file information and breadcrumb', async () => {
    const { wrapper } = await open('/archive/garden-afternoon')
    expect(wrapper.get('main img').attributes('alt')).toContain('photo')
    expect(wrapper.text()).toContain('Mara, Alex')
    expect(wrapper.text()).toContain('Around 1975')
    expect(wrapper.text()).toContain('garden-afternoon.svg')
    expect(wrapper.text()).toContain('May 14, 2025')
    expect(wrapper.get('nav[aria-label="Breadcrumb"] a').attributes('href')).toBe('/')
    expect(wrapper.get('nav[aria-label="Breadcrumb"] [aria-current="page"]').text()).toBe(
      'An afternoon in the garden',
    )
    wrapper.unmount()
  })

  it('shows a prepared PDF preview and a separate unaccepted mock AI suggestion', async () => {
    const { wrapper } = await open('/archive/summer-letter')
    expect(wrapper.get('main img').attributes('alt')).toContain('first page')
    expect(wrapper.text()).toContain('not a PDF viewer')
    expect(wrapper.text()).toContain('Pages')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('Mock AI suggestion')
    expect(wrapper.text()).toContain('has not been added')
    expect(wrapper.get('section').text()).not.toContain('1968')
    wrapper.unmount()
  })

  it.each([
    ['long-filename', 'No preview available'],
    ['letter-processing', 'Preview processing'],
    ['photo-failed', 'Preview unavailable'],
  ])('shows a usable %s fallback', async (id, message) => {
    const { wrapper } = await open(`/archive/${id}`)
    expect(wrapper.text()).toContain(message)
    expect(wrapper.get('nav[aria-label="Breadcrumb"] a').attributes('href')).toBe('/')
    wrapper.unmount()
  })

  it('uses filename and omits absent details for a sparse item', async () => {
    const { wrapper } = await open('/archive/long-filename')
    expect(wrapper.get('h1').text()).toBe(archiveItems[2]!.filename)
    expect(wrapper.text()).not.toContain('Unknown')
    expect(wrapper.text()).not.toContain('People')
    expect(wrapper.text()).not.toContain('Mock AI suggestion')
    wrapper.unmount()
  })

  it('recovers from a broken image on route parameter change and updates titles', async () => {
    const { wrapper, router } = await open('/archive/garden-afternoon')
    await wrapper.get('main img').trigger('error')
    expect(wrapper.text()).toContain('Preview unavailable')
    await router.push('/archive/summer-letter')
    await flushPromises()
    expect(wrapper.get('main img').attributes('alt')).toContain('first page')
    expect(document.title).toBe('A letter from summer camp · Clutterbase')
    await router.push('/archive/not-a-real-item')
    await flushPromises()
    expect(document.title).toBe('Item not found · Clutterbase')
    expect(wrapper.text()).toContain('not found')
    await router.push('/archive/sample-item')
    await flushPromises()
    expect(wrapper.text()).toContain('prototype placeholder')
    wrapper.unmount()
  })
})
