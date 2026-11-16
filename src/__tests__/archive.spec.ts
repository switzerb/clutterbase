import { describe, expect, it } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import ArchiveCard from '../components/archive/ArchiveCard.vue'
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

describe('synthetic archive', () => {
  it('renders rich, sparse and multipage cards with stable routes', async () => {
    const { wrapper } = await open('/')
    const cards = wrapper.findAll('main li')
    expect(cards).toHaveLength(archiveItems.length)
    expect(cards[0]!.text()).toContain('Mara, Alex')
    expect(cards[0]!.text()).toContain('Around 1975')
    expect(cards[1]!.text()).toContain('PDF · 3 pages')
    expect(cards[1]!.find('img').classes()).toContain('object-contain')
    expect(cards[2]!.text()).toContain(archiveItems[2]!.filename)
    expect(cards[2]!.text()).not.toContain('Unknown')
    expect(cards[2]!.text()).toContain('No preview available')
    expect(cards[3]!.text()).toContain('Preview processing')
    expect(cards[4]!.text()).toContain('Preview unavailable')
    for (const [index, item] of archiveItems.entries()) {
      expect(cards[index]!.get('a').attributes('href')).toBe(`/archive/${item.id}`)
      expect(Number.isNaN(Date.parse(item.uploadedAt))).toBe(false)
    }
    expect(new Set(archiveItems.map((item) => item.id)).size).toBe(archiveItems.length)
    wrapper.unmount()
  })

  it('keeps an item linked when its image fails', async () => {
    const router = createAppRouter(createMemoryHistory())
    const wrapper = mount(ArchiveCard, {
      props: { item: archiveItems[0]! },
      global: { plugins: [router] },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.text()).toContain('Preview unavailable')
    expect(wrapper.get('a').attributes('href')).toBe('/archive/garden-afternoon')
    wrapper.unmount()
  })

  it.each(['loading', 'empty', 'error'])('shows and recovers from the %s demo', async (state) => {
    const { wrapper, router } = await open(`/?demo=${state}`)
    expect(wrapper.get('main').text().toLowerCase()).toContain(
      state === 'error' ? 'simulated error' : state,
    )
    expect(wrapper.get('main a').attributes('href')).toBe('/')
    await router.push('/')
    expect(wrapper.findAll('main li')).toHaveLength(archiveItems.length)
    wrapper.unmount()
  })

  it('opens every fixture and preserves the existing sample route', async () => {
    const { wrapper, router } = await open('/')
    for (const item of archiveItems) {
      await router.push(`/archive/${item.id}`)
      await flushPromises()
      expect(wrapper.get('h1').text()).toBe(item.title || item.filename)
      expect(document.title).toBe(`${item.title || item.filename} · Clutterbase`)
      expect(wrapper.text()).toContain('prototype placeholder')
    }
    wrapper.unmount()
  })
})
